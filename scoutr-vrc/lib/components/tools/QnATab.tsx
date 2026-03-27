import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	Pressable,
	TextInput,
	StyleSheet,
	RefreshControl,
	ActivityIndicator,
	Modal
} from 'react-native';
import { Search, CircleAlert, CircleCheck, RefreshCcw } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';
import { useStorage } from '../../state/storage';
import { QnAQuestionDetail } from './QnAQuestionDetail';
import {
	syncQnaQuestions,
	initImageCache,
	cacheAllImages,
	getNetworkStatus,
	type QnaQuestion
} from './qnaData';

const formatDate = (value: number | null): string => {
	if (!value) return 'Unknown date';
	try {
		return new Date(value).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	} catch {
		return 'Unknown date';
	}
};

const ALL_PROGRAMS = ['v5rc', 'vurc', 'judging'] as const;

const PROGRAM_LABELS: Record<string, string> = {
	v5rc: 'V5RC',
	vurc: 'VURC',
	judging: 'Judging'
};

const programStyles = (program: string) => {
	switch (program.trim().toLowerCase()) {
		case 'v5rc':
			return { fg: colors.red, bg: `${colors.red}20` };
		case 'vurc':
			return { fg: colors.blue, bg: `${colors.blue}20` };
		case 'judging':
			return { fg: colors.yellow, bg: `${colors.yellow}20` };
		default:
			return { fg: colors.mutedForeground, bg: `${colors.mutedForeground}20` };
	}
};

const highlightPreview = (question: QnaQuestion): string => {
	const source = question.question || question.questionRaw || '';
	return source
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
};

const QnaCard = memo(
	({ item, onPress }: { item: QnaQuestion; onPress: (item: QnaQuestion) => void }) => {
		const programStyle = programStyles(item.program);
		const preview = highlightPreview(item);
		return (
			<Pressable style={styles.card} onPress={() => onPress(item)}>
				<View style={styles.cardTop}>
					<View style={[styles.programBadge, { backgroundColor: programStyle.bg }]}>
						<Text style={[styles.programText, { color: programStyle.fg }]}>{item.program}</Text>
					</View>
					<View style={styles.stateBadge}>
						{item.answered ? (
							<CircleCheck size={14} color={colors.green} />
						) : (
							<CircleAlert size={14} color={colors.yellow} />
						)}
						<Text style={styles.stateText}>{item.answered ? 'Answered' : 'Open'}</Text>
					</View>
				</View>
				<Text style={styles.cardTitle}>{item.title || `Question ${item.id}`}</Text>
				<Text style={styles.cardMeta}>
					{item.author || 'Unknown author'} · {item.season || 'Unknown season'} ·{' '}
					{formatDate(item.askedTimestampMs)}
				</Text>
				{preview ? (
					<Text style={styles.preview} numberOfLines={3}>
						{preview}
					</Text>
				) : null}
				{item.tags.length > 0 ? (
					<View style={styles.tagsWrap}>
						{item.tags.slice(0, 4).map((tag) => (
							<View key={`${item.id}-${tag}`} style={styles.tagChip}>
								<Text style={styles.tagText}>{tag}</Text>
							</View>
						))}
					</View>
				) : null}
			</Pressable>
		);
	}
);

export const QnATab = () => {
	const [questions, setQuestions] = useState<QnaQuestion[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [warning, setWarning] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [lastSync, setLastSync] = useState<number>(0);
	const [fromCache, setFromCache] = useState(false);
	const [selected, setSelected] = useState<QnaQuestion | null>(null);
	const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);
	const [vpnPending, setVpnPending] = useState<QnaQuestion[] | null>(null);
	const { qnaPrograms, setQnaPrograms } = useStorage();

	const toggleProgram = useCallback(
		(prog: string) => {
			setQnaPrograms(
				qnaPrograms.includes(prog) ? qnaPrograms.filter((p) => p !== prog) : [...qnaPrograms, prog]
			);
		},
		[qnaPrograms, setQnaPrograms]
	);

	const load = useCallback(async (forceRefresh = false) => {
		if (forceRefresh) {
			setRefreshing(true);
			setImageProgress(null);
		} else {
			setLoading(true);
		}
		const result = await syncQnaQuestions(forceRefresh);
		setQuestions(result.questions);
		setWarning(result.warning);
		setLastSync(result.lastSync);
		setFromCache(result.fromCache);
		setRefreshing(false);
		setLoading(false);
		if (result.questions.length > 0) {
			initImageCache(result.questions);
			const { isWifi, isVpn } = await getNetworkStatus();
			if (isVpn) {
				setVpnPending(result.questions);
			} else if (isWifi) {
				void cacheAllImages(result.questions, (done, total) => {
					setImageProgress({ done, total });
				});
			}
		}
	}, []);

	useEffect(() => {
		void load(false);
	}, [load]);

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		const activePrograms = qnaPrograms.length > 0 ? new Set(qnaPrograms) : null;
		const base = activePrograms
			? questions.filter((q) => activePrograms.has(q.program.trim().toLowerCase()))
			: questions;
		if (!normalized) return base;
		const scored: { q: QnaQuestion; score: number }[] = [];
		for (const q of base) {
			const titleMatch = (q.title || '').toLowerCase().includes(normalized);
			const tagsMatch = q.tags.some((t) => t.toLowerCase().includes(normalized));
			const contentMatch = [q.question, q.questionRaw, q.answer, q.answerRaw].some((s) =>
				s?.toLowerCase().includes(normalized)
			);
			const authorMatch = (q.author || '').toLowerCase().includes(normalized);
			if (!titleMatch && !tagsMatch && !contentMatch && !authorMatch) continue;
			const score = titleMatch ? 0 : tagsMatch ? 1 : contentMatch ? 2 : 3;
			scored.push({ q, score });
		}
		scored.sort((a, b) => a.score - b.score);
		return scored.map(({ q }) => q);
	}, [query, questions, qnaPrograms]);

	const handleSelectItem = useCallback((item: QnaQuestion) => setSelected(item), []);
	const renderItem = useCallback(
		({ item }: { item: QnaQuestion }) => <QnaCard item={item} onPress={handleSelectItem} />,
		[handleSelectItem]
	);

	const listRef = useRef<FlatList<QnaQuestion>>(null);
	useEffect(() => {
		if (filtered.length > 0) listRef.current?.scrollToOffset({ offset: 0, animated: false });
	}, [filtered]);

	const syncText = useMemo(() => {
		if (!lastSync) return 'Not synced yet';
		return `Last updated ${new Date(lastSync).toLocaleString()}`;
	}, [lastSync]);

	const staleText = useMemo(() => {
		if (!warning || !fromCache) return null;
		if (lastSync) {
			return `Showing cached data from ${new Date(lastSync).toLocaleString()}. It may be outdated.`;
		}
		return 'Unable to load Q&A data yet. Data may be unavailable or outdated.';
	}, [warning, fromCache, lastSync]);

	const warningTitle = useMemo(() => {
		if (!warning) return null;
		if (fromCache) return staleText;
		return 'Q&A loaded, but there was an update warning.';
	}, [warning, fromCache, staleText]);

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={styles.loadingText}>Loading Q&A...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.searchWrap}>
				<Search size={16} color={colors.mutedForeground} />
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search title, tags, author, or content"
					placeholderTextColor={colors.mutedForeground}
					style={styles.searchInput}
					autoCapitalize="none"
					autoCorrect={false}
				/>
			</View>
			<View style={styles.toolbar}>
				<Text style={styles.toolbarText}>{filtered.length} results</Text>
				<Text style={styles.toolbarText}>{syncText}</Text>
				{fromCache && !warning ? <Text style={styles.toolbarText}>Cached</Text> : null}
				<Pressable style={styles.refreshBtn} onPress={() => void load(true)}>
					<RefreshCcw size={14} color={colors.foreground} />
					<Text style={styles.refreshText}>Refresh</Text>
				</Pressable>
			</View>
			<View style={styles.chipRow}>
				{ALL_PROGRAMS.map((prog) => {
					const active = qnaPrograms.includes(prog);
					const ps = programStyles(prog);
					return (
						<Pressable
							key={prog}
							style={[
								styles.chip,
								active
									? { backgroundColor: ps.bg, borderColor: `${ps.fg}55` }
									: { backgroundColor: colors.muted, borderColor: colors.border }
							]}
							onPress={() => toggleProgram(prog)}
						>
							<Text style={[styles.chipText, { color: active ? ps.fg : colors.mutedForeground }]}>
								{PROGRAM_LABELS[prog]}
							</Text>
						</Pressable>
					);
				})}
			</View>
			{imageProgress !== null &&
			imageProgress.total > 0 &&
			imageProgress.done < imageProgress.total ? (
				<View style={styles.progressOuter}>
					<View
						style={[
							styles.progressFill,
							{ width: `${Math.round((imageProgress.done / imageProgress.total) * 100)}%` }
						]}
					/>
				</View>
			) : null}
			{warning ? (
				<View style={styles.warningCard}>
					<CircleAlert size={16} color={colors.yellow} />
					<View style={styles.warningCopy}>
						{warningTitle ? <Text style={styles.warningText}>{warningTitle}</Text> : null}
						<Text style={styles.warningDetailText}>{warning}</Text>
					</View>
				</View>
			) : null}
			<FlatList
				ref={listRef}
				data={filtered}
				keyExtractor={(item) => item.id}
				refreshControl={
					<RefreshControl
						tintColor={colors.primary}
						refreshing={refreshing}
						onRefresh={() => {
							void load(true);
						}}
					/>
				}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.listContent}
				renderItem={renderItem}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<Text style={styles.emptyTitle}>No Q&A matches this search.</Text>
						<Text style={styles.emptyText}>Try a broader keyword or clear your query.</Text>
					</View>
				}
			/>
			<QnAQuestionDetail
				question={selected}
				visible={selected !== null}
				onClose={() => setSelected(null)}
			/>
			{vpnPending ? (
				<Modal transparent visible animationType="fade" onRequestClose={() => setVpnPending(null)}>
					<Pressable style={styles.vpnOverlay} onPress={() => setVpnPending(null)}>
						<Pressable style={styles.vpnSheet}>
							<Text style={styles.vpnTitle}>VPN Detected</Text>
							<Text style={styles.vpnBody}>
								A VPN is active. Image downloads may be slower or blocked. Download images anyway?
							</Text>
							<View style={styles.vpnActions}>
								<Pressable style={styles.vpnSkip} onPress={() => setVpnPending(null)}>
									<Text style={styles.vpnSkipText}>Skip</Text>
								</Pressable>
								<Pressable
									style={styles.vpnDownload}
									onPress={() => {
										const qs = vpnPending;
										setVpnPending(null);
										void cacheAllImages(qs, (done, total) => {
											setImageProgress({ done, total });
										});
									}}
								>
									<Text style={styles.vpnDownloadText}>Download</Text>
								</Pressable>
							</View>
						</Pressable>
					</Pressable>
				</Modal>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		gap: spacing.sm
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.md,
		paddingHorizontal: spacing.lg
	},
	loadingText: {
		fontSize: font.base,
		color: colors.mutedForeground
	},
	searchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card
	},
	searchInput: {
		flex: 1,
		fontSize: font.base,
		color: colors.foreground,
		padding: 0
	},
	toolbar: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm
	},
	toolbarText: {
		fontSize: font.sm,
		color: colors.mutedForeground
	},
	refreshBtn: {
		marginLeft: 'auto',
		paddingHorizontal: spacing.sm,
		paddingVertical: 6,
		borderRadius: radius.full,
		backgroundColor: colors.muted,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	refreshText: {
		fontSize: font.sm,
		fontWeight: '700',
		color: colors.foreground
	},
	warningCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: `${colors.yellow}55`,
		backgroundColor: `${colors.yellow}16`
	},
	warningCopy: {
		flex: 1,
		gap: 2
	},
	warningText: {
		fontSize: font.sm,
		color: colors.yellow,
		fontWeight: '700'
	},
	warningDetailText: {
		fontSize: font.xs,
		color: colors.yellow
	},
	listContent: {
		gap: spacing.sm,
		paddingBottom: spacing['3xl']
	},
	emptyList: {
		flexGrow: 1,
		justifyContent: 'center'
	},
	emptyState: {
		alignItems: 'center',
		gap: spacing.sm,
		paddingHorizontal: spacing['2xl']
	},
	emptyTitle: {
		fontSize: font.md,
		fontWeight: '700',
		color: colors.foreground
	},
	emptyText: {
		fontSize: font.base,
		textAlign: 'center',
		color: colors.mutedForeground
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		gap: spacing.sm
	},
	cardTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm
	},
	programBadge: {
		borderRadius: radius.full,
		paddingHorizontal: spacing.sm,
		paddingVertical: 4
	},
	programText: {
		fontSize: font.xs,
		fontWeight: '700',
		textTransform: 'uppercase'
	},
	stateBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: spacing.sm,
		paddingVertical: 4,
		borderRadius: radius.full,
		backgroundColor: colors.muted
	},
	stateText: {
		fontSize: font.xs,
		fontWeight: '700',
		color: colors.mutedForeground
	},
	cardTitle: {
		fontSize: font.md,
		fontWeight: '700',
		color: colors.foreground,
		lineHeight: 22
	},
	cardMeta: {
		fontSize: font.sm,
		color: colors.mutedForeground
	},
	preview: {
		fontSize: font.base,
		lineHeight: 21,
		color: colors.foreground
	},
	tagsWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs
	},
	tagChip: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 4,
		borderRadius: radius.full,
		backgroundColor: colors.muted
	},
	tagText: {
		fontSize: font.xs,
		color: colors.mutedForeground
	},
	chipRow: {
		flexDirection: 'row',
		gap: spacing.xs
	},
	chip: {
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: radius.full,
		borderWidth: 1
	},
	chipText: {
		fontSize: font.sm,
		fontWeight: '700',
		textTransform: 'uppercase'
	},
	progressOuter: {
		height: 2,
		backgroundColor: colors.muted,
		borderRadius: 1,
		overflow: 'hidden'
	},
	progressFill: {
		height: 2,
		backgroundColor: colors.primary
	},
	vpnOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'flex-end'
	},
	vpnSheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: radius.xl,
		borderTopRightRadius: radius.xl,
		padding: spacing.xl,
		gap: spacing.md
	},
	vpnTitle: {
		fontSize: font.lg,
		fontWeight: '700',
		color: colors.foreground
	},
	vpnBody: {
		fontSize: font.base,
		color: colors.mutedForeground,
		lineHeight: 22
	},
	vpnActions: {
		flexDirection: 'row',
		gap: spacing.sm
	},
	vpnSkip: {
		flex: 1,
		paddingVertical: spacing.md,
		backgroundColor: colors.muted,
		borderRadius: radius.md,
		alignItems: 'center'
	},
	vpnSkipText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground
	},
	vpnDownload: {
		flex: 1,
		paddingVertical: spacing.md,
		backgroundColor: colors.primary,
		borderRadius: radius.md,
		alignItems: 'center'
	},
	vpnDownloadText: {
		fontSize: font.base,
		fontWeight: '600',
		color: '#fff'
	}
});
