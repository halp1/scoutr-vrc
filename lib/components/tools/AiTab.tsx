import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
	View,
	Text,
	TextInput,
	Pressable,
	ScrollView,
	StyleSheet,
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Platform
} from 'react-native';
import {
	useLLM,
	useTextEmbeddings,
	LLAMA3_2_1B,
	MULTI_QA_MINILM_L6_COS_V1,
	initExecutorch
} from 'react-native-executorch';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bot, Send, Square, BrainCircuit, ImageIcon, RotateCcw, Trash2 } from 'lucide-react-native';
import { documentDirectory } from 'expo-file-system/legacy';
import { Directory } from 'expo-file-system';
import { ConfirmSheet } from '../ConfirmSheet';
import { colors, font, spacing, radius } from '../../theme';
import { useToolsData } from './ToolsDataContext';
import { useKnowledgeBase, type KnowledgeChunk } from './useKnowledgeBase';
import { ImageViewerModal } from './ImageViewer';
import { RuleDrawer } from './RuleDrawer';
import { QnAQuestionDetail } from './QnAQuestionDetail';
import type { ManualEntry } from './gameManual';
import type { QnaQuestion } from './qnaData';

const RULE_RE = /\b([A-Z]{1,3}\d+[a-z]?)\b/g;
const QNA_TOKEN_RE = /\[QNA:(\d+)\]/g;

type Segment = { t: 'text'; s: string } | { t: 'rule'; code: string } | { t: 'qna'; id: string };

const parseSegments = (
	text: string,
	ruleMap: Record<string, ManualEntry>,
	qnaMap: Record<string, QnaQuestion>
): Segment[] => {
	const segments: Segment[] = [];
	const combined = /\[QNA:(\d+)\]|\[RULE:([A-Z]{1,3}\d+[a-z]?)\]|\b([A-Z]{1,3}\d+[a-z]?)\b/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = combined.exec(text)) !== null) {
		if (m.index > last) segments.push({ t: 'text', s: text.slice(last, m.index) });
		if (m[1]) {
			if (qnaMap[m[1]]) segments.push({ t: 'qna', id: m[1] });
			else segments.push({ t: 'text', s: m[0] });
		} else if (m[2]) {
			if (ruleMap[m[2]]) segments.push({ t: 'rule', code: m[2] });
			else segments.push({ t: 'text', s: m[2] });
		} else if (m[3]) {
			if (ruleMap[m[3]]) segments.push({ t: 'rule', code: m[3] });
			else segments.push({ t: 'text', s: m[3] });
		}
		last = m.index + m[0].length;
	}
	if (last < text.length) segments.push({ t: 'text', s: text.slice(last) });
	return segments;
};

const CitationText = ({
	content,
	ruleMap,
	qnaMap,
	onRulePress,
	onQnaPress,
	style
}: {
	content: string;
	ruleMap: Record<string, ManualEntry>;
	qnaMap: Record<string, QnaQuestion>;
	onRulePress: (code: string) => void;
	onQnaPress: (id: string) => void;
	style?: object;
}) => {
	const segments = useMemo(
		() => parseSegments(content, ruleMap, qnaMap),
		[content, ruleMap, qnaMap]
	);
	return (
		<Text style={style}>
			{segments.map((seg, i) => {
				if (seg.t === 'rule') {
					return (
						<Text key={i} style={styles.citationChip} onPress={() => onRulePress(seg.code)}>
							{seg.code}
						</Text>
					);
				}
				if (seg.t === 'qna') {
					return (
						<Text key={i} style={styles.citationChipQna} onPress={() => onQnaPress(seg.id)}>
							Q#{seg.id}
						</Text>
					);
				}
				return <Text key={i}>{seg.s}</Text>;
			})}
		</Text>
	);
};

interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	chunks?: KnowledgeChunk[];
}

const ProgressBar = ({ progress, label }: { progress: number; label: string }) => (
	<View style={styles.progressRow}>
		<Text style={styles.progressLabel}>{label}</Text>
		<View style={styles.progressTrack}>
			<View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
		</View>
		<Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
	</View>
);

export const AiTab = () => {
	const {
		manual,
		isManualLoading,
		manualProgress,
		manualProgressLabel,
		questions,
		isQnaLoading,
		qnaLastSync
	} = useToolsData();

	useEffect(() => {
		initExecutorch({ resourceFetcher: ExpoResourceFetcher });
	}, []);

	const [modelEnabled, setModelEnabled] = useState(false);
	useEffect(() => {
		AsyncStorage.getItem('ai-model-enabled').then((v) => {
			if (v === '1') setModelEnabled(true);
		});
	}, []);
	const enableModel = useCallback(() => {
		setModelEnabled(true);
		AsyncStorage.setItem('ai-model-enabled', '1');
	}, []);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState('');
	const [viewerImage, setViewerImage] = useState<string | null>(null);
	const [ruleDrawerEntry, setRuleDrawerEntry] = useState<ManualEntry | null>(null);
	const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);
	const [qnaDetailQuestion, setQnaDetailQuestion] = useState<QnaQuestion | null>(null);
	const [qnaDetailVisible, setQnaDetailVisible] = useState(false);
	const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

	const deleteModels = useCallback(async () => {
		setDeleteConfirmVisible(false);
		try {
			const dir = new Directory(`${documentDirectory}react-native-executorch/`);
			if (dir.exists) {
				await dir.delete();
			}
		} catch {}
		setModelEnabled(false);
		await AsyncStorage.removeItem('ai-model-enabled');
	}, []);

	const ruleMap = useMemo(() => manual?.ruleMap ?? {}, [manual]);
	const qnaMap = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

	const openRule = useCallback(
		(code: string) => {
			const entry = ruleMap[code];
			if (!entry) return;
			setRuleDrawerEntry(entry);
			setRuleDrawerVisible(true);
		},
		[ruleMap]
	);

	const openQna = useCallback(
		(id: string) => {
			const q = qnaMap[id];
			if (!q) return;
			setQnaDetailQuestion(q);
			setQnaDetailVisible(true);
		},
		[qnaMap]
	);

	const chatMessagesRef = useRef(chatMessages);
	useEffect(() => {
		chatMessagesRef.current = chatMessages;
	}, [chatMessages]);

	const pendingUserMsgRef = useRef<string | null>(null);
	const pendingChunksRef = useRef<KnowledgeChunk[]>([]);

	const llm = useLLM({ model: LLAMA3_2_1B, preventLoad: !modelEnabled });
	const textEmbeddings = useTextEmbeddings({
		model: MULTI_QA_MINILM_L6_COS_V1,
		preventLoad: !modelEnabled
	});

	const kb = useKnowledgeBase(textEmbeddings, manual, questions, qnaLastSync);

	const scrollRef = useRef<ScrollView>(null);

	useEffect(() => {
		if (!llm.isGenerating && pendingUserMsgRef.current !== null) {
			const userContent = pendingUserMsgRef.current;
			const assistantContent = llm.response;
			const chunks = pendingChunksRef.current;
			pendingUserMsgRef.current = null;
			pendingChunksRef.current = [];
			if (assistantContent) {
				setChatMessages((prev) => [
					...prev,
					{ role: 'user', content: userContent },
					{ role: 'assistant', content: assistantContent, chunks }
				]);
			}
		}
	}, [llm.isGenerating]);

	const submitMessage = useCallback(async () => {
		const input = inputText.trim();
		if (!input || llm.isGenerating || !kb.isIndexed || !llm.isReady) return;
		setInputText('');

		const chunks = await kb.query(input);
		pendingUserMsgRef.current = input;
		pendingChunksRef.current = chunks;

		const contextText = chunks
			.map((c) => {
				const ruleTag = c.ruleCode ? ` [RULE:${c.ruleCode}]` : '';
				const qnaTag = c.qnaId ? ` [QNA:${c.qnaId}]` : '';
				return ruleTag + qnaTag + c.text;
			})
			.join('\n---\n');

		console.log(
			contextText,
			chunks.map((c) => c.ruleCode ?? c.qnaId ?? 'no-ref')
		);

		const systemContent = `You are a VRC (VEX Robotics Competition) rules expert assistant. Answer concisely and accurately. When citing a rule, include its tag (e.g., [RULE:SC1]) exactly as shown in the context. When citing a Q&A, include its tag (e.g., [QNA:1234]) exactly as shown in the context. Do not speculate beyond the provided context. ALWAYS reference the provided content via a rule or Q&A tag in the format specified.\n\nCONTEXT:\n${contextText}`;

		const history = chatMessagesRef.current.slice(-6).map((m) => ({
			role: m.role,
			content: m.content
		}));

		const res = await llm.generate([
			{ role: 'system', content: systemContent },
			...history,
			{ role: 'user', content: input }
		]);
		console.log(res);
	}, [inputText, llm, kb]);

	const resetChat = useCallback(() => {
		if (llm.isGenerating) llm.interrupt();
		pendingUserMsgRef.current = null;
		pendingChunksRef.current = [];
		setChatMessages([]);
	}, [llm]);

	useEffect(() => {
		if (llm.isGenerating || pendingUserMsgRef.current !== null) {
			scrollRef.current?.scrollToEnd({ animated: true });
		}
	}, [llm.response, llm.isGenerating]);

	const dataLoading = isManualLoading || isQnaLoading;
	const modelDownloading = modelEnabled && (!llm.isReady || !textEmbeddings.isReady);
	const indexBuilding = !modelDownloading && modelEnabled && !kb.isIndexed;
	const chatReady = modelEnabled && llm.isReady && textEmbeddings.isReady && kb.isIndexed;

	if (dataLoading) {
		return (
			<View style={styles.centerState}>
				<Text style={styles.stateTitle}>Loading game data…</Text>
				<View style={styles.progressContainer}>
					<ProgressBar
						progress={isManualLoading ? manualProgress : 1}
						label={isManualLoading ? manualProgressLabel : 'Game Manual'}
					/>
					<ProgressBar
						progress={isQnaLoading ? 0 : 1}
						label={isQnaLoading ? 'Syncing Q&A…' : 'Q&A'}
					/>
				</View>
			</View>
		);
	}

	if (!modelEnabled) {
		return (
			<View style={styles.centerState}>
				<View style={styles.welcomeCard}>
					<Bot size={40} color={colors.primary} />
					<Text style={styles.welcomeTitle}>VRC AI Assistant</Text>
					<Text style={styles.welcomeBody}>
						Chat with an on-device AI that knows the game manual and official Q&amp;A. Useful during
						matches and discussions with referees.
					</Text>
					<Text style={styles.welcomeDisclaimer}>
						The model (~1.5 GB) will be downloaded and run locally on your device.
					</Text>
					<Pressable style={styles.loadBtn} onPress={enableModel}>
						<BrainCircuit size={18} color={colors.primaryForeground} />
						<Text style={styles.loadBtnText}>Load Model</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	if (modelDownloading) {
		const llmProg = llm.downloadProgress ?? 0;
		const embProg = textEmbeddings.downloadProgress ?? 0;
		return (
			<View style={styles.centerState}>
				<Text style={styles.stateTitle}>Downloading models…</Text>
				<Text style={styles.doNotLeave}>Do not exit the app</Text>
				<View style={styles.progressContainer}>
					<ProgressBar progress={llmProg} label="Llama 3.2 1B" />
					<ProgressBar progress={embProg} label="Embedding model" />
				</View>
				{(llm.error ?? textEmbeddings.error) ? (
					<Text style={styles.errorText}>{String(llm.error ?? textEmbeddings.error)}</Text>
				) : null}
				<ConfirmSheet
					visible={deleteConfirmVisible}
					title="Delete Models"
					body="This will delete all downloaded model files and free up storage. You can re-download them later."
					confirmLabel="Delete"
					destructive
					onCancel={() => setDeleteConfirmVisible(false)}
					onConfirm={deleteModels}
				/>
			</View>
		);
	}

	if (indexBuilding) {
		return (
			<View style={styles.centerState}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={styles.stateTitle}>Building knowledge index…</Text>
				<View style={styles.progressContainer}>
					<ProgressBar progress={kb.indexProgress} label="Indexing manual &amp; Q&amp;A" />
				</View>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView style={styles.chatRoot} behavior="padding" keyboardVerticalOffset={0}>
			<View style={styles.chatActionBar}>
				<Text style={styles.disclaimerText}>AI may make mistakes. This feature is in beta.</Text>
				<View style={styles.chatActionBtns}>
					{chatMessages.length > 0 && (
						<Pressable style={styles.resetChatBtn} onPress={resetChat}>
							<RotateCcw size={14} color={colors.mutedForeground} />
							<Text style={styles.resetChatText}>New chat</Text>
						</Pressable>
					)}
					<Pressable style={styles.resetChatBtn} onPress={() => setDeleteConfirmVisible(true)}>
						<Trash2 size={14} color={colors.mutedForeground} />
						<Text style={styles.resetChatText}>Delete models</Text>
					</Pressable>
				</View>
			</View>
			<ConfirmSheet
				visible={deleteConfirmVisible}
				title="Delete Models"
				body="This will delete all downloaded model files and free up storage. You can re-download them later."
				confirmLabel="Delete"
				destructive
				onCancel={() => setDeleteConfirmVisible(false)}
				onConfirm={deleteModels}
			/>
			<ScrollView
				ref={scrollRef}
				style={styles.messageList}
				contentContainerStyle={styles.messageListContent}
				onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
			>
				{chatMessages.length === 0 && pendingUserMsgRef.current === null && (
					<View style={styles.emptyChat}>
						<Bot size={32} color={colors.mutedForeground} />
						<Text style={styles.emptyChatText}>Ask about rules, scoring, or strategy.</Text>
					</View>
				)}

				{chatMessages.map((msg, idx) => (
					<View
						key={idx}
						style={msg.role === 'user' ? styles.userBubbleRow : styles.assistantBubbleRow}
					>
						<View style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
							{msg.role === 'user' ? (
								<Text style={styles.userText}>{msg.content}</Text>
							) : (
								<CitationText
									content={msg.content}
									ruleMap={ruleMap}
									qnaMap={qnaMap}
									onRulePress={openRule}
									onQnaPress={openQna}
									style={styles.assistantText}
								/>
							)}
						</View>
						{msg.role === 'assistant' && msg.chunks && msg.chunks.length > 0 && (
							<ImageStrip chunks={msg.chunks} onPress={(src) => setViewerImage(src)} />
						)}
					</View>
				))}

				{llm.isGenerating && pendingUserMsgRef.current !== null && (
					<>
						<View style={styles.userBubbleRow}>
							<View style={styles.userBubble}>
								<Text style={styles.userText}>{pendingUserMsgRef.current}</Text>
							</View>
						</View>
						<View style={styles.assistantBubbleRow}>
							<View style={styles.assistantBubble}>
								{llm.response ? (
									<Text style={styles.assistantText}>{llm.response}</Text>
								) : (
									<ActivityIndicator size="small" color={colors.mutedForeground} />
								)}
							</View>
						</View>
					</>
				)}
			</ScrollView>

			<View style={styles.inputRow}>
				<TextInput
					style={styles.input}
					value={inputText}
					onChangeText={setInputText}
					placeholder="Ask about a rule…"
					placeholderTextColor={colors.mutedForeground}
					multiline
					maxLength={512}
					returnKeyType="send"
					onSubmitEditing={() => {
						void submitMessage();
					}}
					blurOnSubmit={false}
					editable={!llm.isGenerating}
				/>
				{llm.isGenerating ? (
					<Pressable style={styles.sendBtn} onPress={() => llm.interrupt()}>
						<Square size={18} color={colors.primaryForeground} fill={colors.primaryForeground} />
					</Pressable>
				) : (
					<Pressable
						style={[styles.sendBtn, (!inputText.trim() || !chatReady) && styles.sendBtnDisabled]}
						onPress={() => {
							void submitMessage();
						}}
						disabled={!inputText.trim() || !chatReady}
					>
						<Send size={18} color={colors.primaryForeground} />
					</Pressable>
				)}
			</View>

			{viewerImage ? (
				<ImageViewerModal src={viewerImage} alt="Rule image" onClose={() => setViewerImage(null)} />
			) : null}

			<RuleDrawer
				entry={ruleDrawerEntry}
				visible={ruleDrawerVisible}
				onClose={() => setRuleDrawerVisible(false)}
				onCrossRef={openRule}
				onQnaRef={openQna}
			/>
			<QnAQuestionDetail
				question={qnaDetailQuestion}
				visible={qnaDetailVisible}
				onClose={() => setQnaDetailVisible(false)}
			/>
		</KeyboardAvoidingView>
	);
};

const ImageStrip = ({
	chunks,
	onPress
}: {
	chunks: KnowledgeChunk[];
	onPress: (src: string) => void;
}) => {
	const srcs = [...new Set(chunks.flatMap((c) => c.imageSrcs))].slice(0, 5);
	if (srcs.length === 0) return null;
	return (
		<View style={styles.imageStrip}>
			{srcs.map((src) => (
				<Pressable key={src} onPress={() => onPress(src)}>
					<Image source={{ uri: src }} style={styles.imageThumbnail} resizeMode="cover" />
					<View style={styles.imageThumbnailOverlay}>
						<ImageIcon size={14} color={colors.foreground} />
					</View>
				</Pressable>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	centerState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing['2xl'],
		gap: spacing.md
	},
	stateText: {
		fontSize: font.base,
		color: colors.mutedForeground,
		textAlign: 'center'
	},
	stateSubtext: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		textAlign: 'center',
		opacity: 0.7
	},
	stateTitle: {
		fontSize: font.md,
		fontWeight: '600',
		color: colors.foreground,
		textAlign: 'center'
	},
	welcomeCard: {
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		padding: spacing['2xl'],
		alignItems: 'center',
		gap: spacing.md,
		maxWidth: 340
	},
	welcomeTitle: {
		fontSize: font.xl,
		fontWeight: '700',
		color: colors.foreground,
		textAlign: 'center'
	},
	welcomeBody: {
		fontSize: font.base,
		color: colors.mutedForeground,
		textAlign: 'center',
		lineHeight: 20
	},
	welcomeDisclaimer: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		textAlign: 'center',
		opacity: 0.6
	},
	loadBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.primary,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.md,
		marginTop: spacing.xs
	},
	loadBtnText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.primaryForeground
	},
	progressContainer: {
		width: '100%',
		gap: spacing.sm
	},
	progressRow: {
		gap: spacing.xs
	},
	progressLabel: {
		fontSize: font.sm,
		color: colors.mutedForeground
	},
	progressTrack: {
		height: 6,
		backgroundColor: colors.muted,
		borderRadius: radius.full,
		overflow: 'hidden'
	},
	progressFill: {
		height: '100%',
		backgroundColor: colors.primary,
		borderRadius: radius.full
	},
	progressPct: {
		fontSize: font.xs,
		color: colors.mutedForeground,
		textAlign: 'right'
	},
	errorText: {
		fontSize: font.sm,
		color: colors.destructive,
		textAlign: 'center'
	},
	chatRoot: {
		flex: 1,
		backgroundColor: colors.background
	},
	messageList: { flex: 1 },
	messageListContent: {
		padding: spacing.md,
		gap: spacing.sm
	},
	emptyChat: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80,
		gap: spacing.sm
	},
	emptyChatText: {
		fontSize: font.base,
		color: colors.mutedForeground,
		textAlign: 'center'
	},
	userBubbleRow: {
		alignItems: 'flex-end',
		marginVertical: spacing.xs
	},
	assistantBubbleRow: {
		alignItems: 'flex-start',
		marginVertical: spacing.xs
	},
	userBubble: {
		backgroundColor: colors.primary,
		borderRadius: radius.lg,
		borderBottomRightRadius: radius.sm,
		padding: spacing.md,
		maxWidth: '80%'
	},
	assistantBubble: {
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		borderBottomLeftRadius: radius.sm,
		padding: spacing.md,
		maxWidth: '90%'
	},
	userText: {
		fontSize: font.base,
		color: colors.primaryForeground,
		lineHeight: 20
	},
	assistantText: {
		fontSize: font.base,
		color: colors.foreground,
		lineHeight: 20
	},
	imageStrip: {
		flexDirection: 'row',
		gap: spacing.xs,
		marginTop: spacing.xs,
		paddingLeft: spacing.xs
	},
	imageThumbnail: {
		width: 60,
		height: 60,
		borderRadius: radius.sm,
		backgroundColor: colors.muted
	},
	imageThumbnailOverlay: {
		position: 'absolute',
		bottom: 4,
		right: 4,
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: radius.sm,
		padding: 2
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: spacing.md,
		gap: spacing.sm,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.background
	},
	input: {
		flex: 1,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		fontSize: font.base,
		color: colors.foreground,
		maxHeight: 120,
		minHeight: 44
	},
	sendBtn: {
		width: 44,
		height: 44,
		borderRadius: radius.full,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center'
	},
	sendBtnDisabled: {
		opacity: 0.4
	},
	citationChip: {
		color: colors.primary,
		fontWeight: '600',
		backgroundColor: `${colors.primary}20`,
		borderRadius: 4,
		paddingHorizontal: 3
	},
	citationChipQna: {
		color: colors.blue,
		fontWeight: '600',
		backgroundColor: `${colors.blue}20`,
		borderRadius: 4,
		paddingHorizontal: 3
	},
	doNotLeave: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		fontWeight: '600',
		textAlign: 'center',
		marginTop: -spacing.xs
	},
	chatActionBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs
	},
	chatActionBtns: {
		flexDirection: 'row',
		gap: spacing.xs
	},
	disclaimerText: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		opacity: 0.6
	},
	resetChatBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.sm,
		backgroundColor: colors.muted,
		borderRadius: radius.md
	},
	resetChatText: {
		fontSize: font.sm,
		color: colors.mutedForeground
	}
});
