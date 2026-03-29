import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { parse } from 'node-html-parser';
import { entrySearchText, type ManualData, type ManualEntry } from './gameManual';
import { resolveImageUri, type QnaQuestion } from './qnaData';

const KB_VERSION_KEY = 'ai-kb-version';
const KB_INDEX_FILE = 'ai-kb-index.json';
const KB_SCHEMA_VERSION = '2';
const MAX_CHUNK_CHARS = 500;

export interface KnowledgeChunk {
	id: string;
	text: string;
	imageSrcs: string[];
	source: 'manual' | 'qna';
	ruleCode?: string;
	qnaId?: string;
}

interface KbIndex {
	version: string;
	chunks: KnowledgeChunk[];
	embeddings: number[][];
}

const stripHtml = (html: string): string =>
	html
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const extractImgSrcs = (html: string): string[] => {
	const srcs: string[] = [];
	try {
		const root = parse(html);
		for (const img of root.querySelectorAll('img')) {
			const src = img.getAttribute('src');
			if (src) {
				const normalized = src.startsWith('//') ? `https:${src}` : src;
				if (normalized.startsWith('http')) srcs.push(resolveImageUri(normalized));
			}
		}
	} catch {}
	return srcs;
};

const extractManualFigureSrcs = (entry: ManualEntry): string[] => {
	const srcs: string[] = [];
	const walkBlocks = (blocks: ManualEntry['blocks']) => {
		for (const b of blocks) {
			if (b.type === 'figure' && b.src) srcs.push(b.src);
			else if (b.type === 'redbox' || b.type === 'greybox' || b.type === 'vexubox')
				walkBlocks(b.blocks);
		}
	};
	walkBlocks(entry.blocks);
	return srcs;
};

const buildCorpus = (manual: ManualData, questions: QnaQuestion[]): KnowledgeChunk[] => {
	const chunks: KnowledgeChunk[] = [];

	for (const section of manual.sections) {
		for (const sub of section.subsections) {
			for (const entry of sub.entries) {
				const full = entrySearchText(entry);
				const label = entry.code ?? entry.term ?? sub.title;
				const imageSrcs = extractManualFigureSrcs(entry);
				const parts = Math.ceil(full.length / MAX_CHUNK_CHARS) || 1;
				for (let i = 0; i < parts; i++) {
					const slice = full.slice(i * MAX_CHUNK_CHARS, (i + 1) * MAX_CHUNK_CHARS).trim();
					if (!slice) continue;
					chunks.push({
						id: `manual:${sub.id}:${label}:${i}`,
						text: slice,
						imageSrcs: i === 0 ? imageSrcs : [],
						source: 'manual',
						ruleCode: entry.code
					});
				}
			}
		}
	}

	for (const q of questions) {
		if (!q.answered) continue;
		const text = [
			q.title,
			stripHtml(q.questionRaw ?? q.question ?? ''),
			stripHtml(q.answerRaw ?? q.answer ?? '')
		]
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, MAX_CHUNK_CHARS);
		const imageSrcs = [
			...extractImgSrcs(q.questionRaw ?? ''),
			...extractImgSrcs(q.answerRaw ?? '')
		];
		chunks.push({
			id: `qna:${q.id}`,
			text,
			imageSrcs,
			source: 'qna',
			qnaId: q.id
		});
	}

	return chunks;
};

const cosine = (a: number[], b: number[]): number => {
	let dot = 0,
		na = 0,
		nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	const denom = Math.sqrt(na) * Math.sqrt(nb);
	return denom === 0 ? 0 : dot / denom;
};

const getKbFile = () => new File(Paths.document, KB_INDEX_FILE);

const loadCachedIndex = async (version: string): Promise<KbIndex | null> => {
	try {
		const storedVersion = await AsyncStorage.getItem(KB_VERSION_KEY);
		if (storedVersion !== version) return null;
		const file = getKbFile();
		if (!file.exists) return null;
		const json = await file.text();
		return JSON.parse(json) as KbIndex;
	} catch {
		return null;
	}
};

const saveCachedIndex = async (index: KbIndex): Promise<void> => {
	try {
		const file = getKbFile();
		await file.write(JSON.stringify(index));
		await AsyncStorage.setItem(KB_VERSION_KEY, index.version);
	} catch {}
};

export const useKnowledgeBase = (
	textEmbeddings: { forward: (text: string) => Promise<Float32Array>; isReady: boolean },
	manual: ManualData | null,
	questions: QnaQuestion[],
	qnaLastSync: number
) => {
	const [isIndexed, setIsIndexed] = useState(false);
	const [isBuilding, setIsBuilding] = useState(false);
	const [indexProgress, setIndexProgress] = useState(0);

	const indexRef = useRef<KbIndex | null>(null);
	const buildingRef = useRef(false);

	const buildIndex = useCallback(async () => {
		if (!textEmbeddings.isReady || !manual || buildingRef.current) return;
		buildingRef.current = true;
		setIsBuilding(true);
		setIndexProgress(0);

		try {
			const version = `${KB_SCHEMA_VERSION}:${manual.version}:${qnaLastSync}`;
			const cached = await loadCachedIndex(version);
			if (cached) {
				indexRef.current = cached;
				setIsIndexed(true);
				setIndexProgress(1);
				setIsBuilding(false);
				buildingRef.current = false;
				return;
			}

			const chunks = buildCorpus(manual, questions);
			const embeddings: number[][] = [];
			for (let i = 0; i < chunks.length; i++) {
				const emb = await textEmbeddings.forward(chunks[i].text);
				embeddings.push(Array.from(emb));
				setIndexProgress((i + 1) / chunks.length);
			}

			const index: KbIndex = { version, chunks, embeddings };
			await saveCachedIndex(index);
			indexRef.current = index;
			setIsIndexed(true);
		} catch {
			setIsIndexed(false);
		} finally {
			setIsBuilding(false);
			buildingRef.current = false;
		}
	}, [textEmbeddings, manual, questions, qnaLastSync]);

	const query = useCallback(
		async (q: string, topK = 3): Promise<KnowledgeChunk[]> => {
			const index = indexRef.current;
			if (!index || !textEmbeddings.isReady) return [];
			try {
				const qEmb = Array.from(await textEmbeddings.forward(q.slice(0, MAX_CHUNK_CHARS)));
				const scored = index.chunks.map((chunk, i) => ({
					chunk,
					score: cosine(qEmb, index.embeddings[i])
				}));
				scored.sort((a, b) => b.score - a.score);
				return scored.slice(0, topK).map((s) => s.chunk);
			} catch {
				return [];
			}
		},
		[textEmbeddings]
	);

	useEffect(() => {
		if (textEmbeddings.isReady && manual && questions.length > 0 && !isIndexed && !isBuilding) {
			void buildIndex();
		}
	}, [textEmbeddings.isReady, manual, questions.length, isIndexed, isBuilding, buildIndex]);

	return { buildIndex, query, indexProgress, isIndexed, isBuilding };
};
