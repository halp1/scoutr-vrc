import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	View,
	Text,
	ScrollView,
	Pressable,
	TextInput,
	FlatList,
	Modal,
	StyleSheet,
	Keyboard,
	BackHandler,
	Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, List, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';
import {
	getManual,
	spansText,
	entrySearchText,
	type ManualEntry,
	type ManualSection,
	type ManualSubsection
} from './gameManual';
import { ManualToC } from './ManualToC';
import { RuleDrawer } from './RuleDrawer';
import { BlocksView, InlineText } from './BlockRenderer';
import { ImageViewerModal } from './ImageViewer';
import { QnAQuestionDetail } from './QnAQuestionDetail';
import { syncQnaQuestions, type QnaQuestion } from './qnaData';

interface SearchResult {
	entry: ManualEntry;
	sectionId: string;
	subsectionId: string;
	label: string;
}

const buildSearchIndex = (sections: ManualSection[]): SearchResult[] => {
	const results: SearchResult[] = [];
	for (const section of sections) {
		for (const sub of section.subsections) {
			for (const entry of sub.entries) {
				const label = entry.code ?? entry.term ?? entry.summary ?? '';
				if (label) {
					results.push({ entry, sectionId: section.id, subsectionId: sub.id, label });
				}
			}
		}
	}
	return results;
};

const searchEntries = (index: SearchResult[], query: string): SearchResult[] => {
	const q = query.toLowerCase().trim();
	if (!q) return [];
	return index.filter(
		(r) =>
			r.label.toLowerCase().includes(q) ||
			entrySearchText(r.entry).toLowerCase().includes(q) ||
			(r.entry.summary?.toLowerCase().includes(q) ?? false)
	);
};

export const GameManualTab = () => {
	const insets = useSafeAreaInsets();
	const [manual, setManual] = useState<{
		version: string;
		sections: ManualSection[];
		ruleMap: Record<string, ManualEntry>;
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState(0);
	const [progressLabel, setProgressLabel] = useState('Connecting...');
	const [error, setError] = useState<string | null>(null);
	const [activeSection, setActiveSection] = useState<ManualSection | null>(null);
	const [activeSubsection, setActiveSubsection] = useState<ManualSubsection | null>(null);
	const [tocVisible, setTocVisible] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [ruleDrawerEntry, setRuleDrawerEntry] = useState<ManualEntry | null>(null);
	const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);
	const [imageViewer, setImageViewer] = useState<{
		src: string;
		alt: string;
		caption?: string;
	} | null>(null);
	const [qnaDetailQuestion, setQnaDetailQuestion] = useState<QnaQuestion | null>(null);
	const [qnaDetailVisible, setQnaDetailVisible] = useState(false);
	const [highlightEntry, setHighlightEntry] = useState<ManualEntry | null>(null);

	const sectionScrollRef = useRef<ScrollView>(null);
	const scrollInnerRef = useRef<View>(null);
	const searchIndexRef = useRef<SearchResult[]>([]);

	const load = useCallback(async () => {
		setLoading(true);
		setProgress(0);
		setError(null);
		try {
			const data = await getManual((p, label) => {
				setProgress(p);
				setProgressLabel(label);
			});
			setManual(data);
			searchIndexRef.current = buildSearchIndex(data.sections);
		} catch (e: any) {
			setError(e?.message ?? 'Failed to load game manual.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const handler = BackHandler.addEventListener('hardwareBackPress', () => {
			if (ruleDrawerVisible) {
				setRuleDrawerVisible(false);
				return true;
			}
			if (searchVisible) {
				setSearchVisible(false);
				setSearchQuery('');
				return true;
			}
			if (tocVisible) {
				setTocVisible(false);
				return true;
			}
			if (activeSubsection) {
				setActiveSubsection(null);
				setActiveSection(activeSection);
				return true;
			}
			if (activeSection) {
				setActiveSection(null);
				return true;
			}
			return false;
		});
		return () => handler.remove();
	}, [ruleDrawerVisible, searchVisible, tocVisible, activeSubsection, activeSection]);

	useEffect(() => {
		load();
	}, [load]);

	const openRule = useCallback((entry: ManualEntry) => {
		setRuleDrawerEntry(entry);
		setRuleDrawerVisible(true);
	}, []);

	const handleCrossRef = useCallback(
		(code: string) => {
			if (!manual) return;
			const entry = manual.ruleMap[code.toLowerCase()];
			if (entry) setRuleDrawerEntry(entry);
		},
		[manual]
	);

	const handleQnaRef = useCallback(async (id: string) => {
		const result = await syncQnaQuestions();
		const question = result.questions.find((q) => q.id === id) ?? null;
		if (question) {
			setQnaDetailQuestion(question);
			setQnaDetailVisible(true);
		}
	}, []);

	const handleNavigateToSource = useCallback(
		(entry: ManualEntry) => {
			if (!manual) return;
			let found: ManualEntry | null = null;
			let targetSection: ManualSection | null = null;
			let targetSub: ManualSubsection | null = null;
			// First pass: identity
			outer: for (const section of manual.sections) {
				for (const sub of section.subsections) {
					if (sub.entries.includes(entry)) {
						found = entry;
						targetSection = section;
						targetSub = sub;
						break outer;
					}
				}
			}
			// Second pass: string match
			if (!found) {
				const matchCode = entry.code?.toLowerCase();
				const matchSourceId = entry.sourceId?.toLowerCase();
				const matchTerm = entry.term;
				outer2: for (const section of manual.sections) {
					for (const sub of section.subsections) {
						const match = sub.entries.find(
							(e) =>
								(matchCode && e.code?.toLowerCase() === matchCode) ||
								(matchSourceId && e.sourceId?.toLowerCase() === matchSourceId) ||
								(matchTerm && e.term === matchTerm)
						);
						if (match) {
							found = match;
							targetSection = section;
							targetSub = sub;
							break outer2;
						}
					}
				}
			}
			setRuleDrawerVisible(false);
			if (found && targetSection && targetSub) {
				setActiveSection(targetSection);
				setActiveSubsection(targetSub);
				sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
				setHighlightEntry(found);
			}
		},
		[manual]
	);

	const handleTocSelect = useCallback(
		(sectionId: string, subsectionId?: string) => {
			if (!manual) return;
			const section = manual.sections.find((s) => s.id === sectionId) ?? null;
			setActiveSection(section);
			if (subsectionId && section) {
				const sub = section.subsections.find((s) => s.id === subsectionId) ?? null;
				setActiveSubsection(sub);
			} else {
				setActiveSubsection(null);
			}
			setTocVisible(false);
			sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
		},
		[manual]
	);

	const searchResults = searchVisible ? searchEntries(searchIndexRef.current, searchQuery) : [];

	const currentSubIndex =
		activeSection && activeSubsection
			? activeSection.subsections.findIndex((s) => s === activeSubsection)
			: -1;
	const prevSubsection =
		currentSubIndex > 0 ? activeSection!.subsections[currentSubIndex - 1] : null;
	const nextSubsection =
		activeSection && currentSubIndex >= 0 && currentSubIndex < activeSection.subsections.length - 1
			? activeSection.subsections[currentSubIndex + 1]
			: null;

	if (loading) {
		return (
			<View style={styles.centered}>
				<Text style={styles.loadingText}>{progressLabel}</Text>
				<View style={styles.progressBarBg}>
					<View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
				</View>
				<Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
			</View>
		);
	}

	if (error || !manual) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{error ?? 'Unknown error.'}</Text>
				<Pressable style={styles.retryBtn} onPress={load}>
					<Text style={styles.retryText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.root}>
			<View style={styles.headerRow}>
				{activeSection ? (
					<Pressable
						style={styles.backBtn}
						onPress={() => {
							if (activeSubsection) {
								setActiveSubsection(null);
							} else {
								setActiveSection(null);
							}
						}}
						hitSlop={8}
					>
						<ChevronLeft size={20} color={colors.foreground} strokeWidth={2} />
						<Text style={styles.backText} numberOfLines={1}>
							{activeSubsection ? activeSection.title : 'Game Manual'}
						</Text>
					</Pressable>
				) : (
					<View style={styles.headerLeft}>
						<Text style={styles.headerTitle}>Game Manual</Text>
						<Text style={styles.versionBadge}>{manual.version}</Text>
					</View>
				)}
				<View style={styles.headerActions}>
					<Pressable style={styles.iconBtn} onPress={() => setSearchVisible(true)} hitSlop={8}>
						<Search size={20} color={colors.mutedForeground} strokeWidth={2} />
					</Pressable>
					<Pressable style={styles.iconBtn} onPress={() => setTocVisible(true)} hitSlop={8}>
						<List size={20} color={colors.mutedForeground} strokeWidth={2} />
					</Pressable>
				</View>
			</View>

			{activeSection && activeSubsection ? (
				<ScrollView
					ref={sectionScrollRef}
					style={styles.scroll}
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingBottom: insets.bottom + spacing['3xl'] }
					]}
					showsVerticalScrollIndicator={false}
				>
					<SubsectionDetailView
						section={activeSection}
						subsection={activeSubsection}
						onCrossRef={(code) => {
							const entry = manual.ruleMap[code.toLowerCase()];
							if (entry) openRule(entry);
						}}
						onQnaRef={handleQnaRef}
						onImagePress={(src, alt, caption) => setImageViewer({ src, alt, caption })}
					/>
					<View style={styles.subsectionNav}>
						{prevSubsection ? (
							<Pressable
								style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
								onPress={() => {
									setActiveSubsection(prevSubsection);
									sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
								}}
							>
								<ChevronLeft size={16} color={colors.mutedForeground} strokeWidth={2} />
								<Text style={styles.navBtnText} numberOfLines={1}>
									{prevSubsection.title}
								</Text>
							</Pressable>
						) : (
							<View />
						)}
						{nextSubsection ? (
							<Pressable
								style={({ pressed }) => [
									styles.navBtn,
									styles.navBtnRight,
									pressed && styles.navBtnPressed
								]}
								onPress={() => {
									setActiveSubsection(nextSubsection);
									sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
								}}
							>
								<Text style={styles.navBtnText} numberOfLines={1}>
									{nextSubsection.title}
								</Text>
								<ChevronRight size={16} color={colors.mutedForeground} strokeWidth={2} />
							</Pressable>
						) : (
							<View />
						)}
					</View>
				</ScrollView>
			) : activeSection ? (
				<ScrollView
					ref={sectionScrollRef}
					style={styles.scroll}
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingBottom: insets.bottom + spacing['3xl'] }
					]}
					showsVerticalScrollIndicator={false}
				>
					<SectionView
						section={activeSection}
						onSelectSubsection={(sub) => {
							setActiveSubsection(sub);
							sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
						}}
					/>
				</ScrollView>
			) : (
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingBottom: insets.bottom + spacing['3xl'] }
					]}
					showsVerticalScrollIndicator={false}
				>
					<HomeView sections={manual.sections} onSelect={setActiveSection} />
				</ScrollView>
			)}

			<ManualToC
				visible={tocVisible}
				onClose={() => setTocVisible(false)}
				sections={manual.sections}
				onSelect={handleTocSelect}
			/>

			<RuleDrawer
				entry={ruleDrawerEntry}
				visible={ruleDrawerVisible}
				onClose={() => setRuleDrawerVisible(false)}
				onCrossRef={handleCrossRef}
				onQnaRef={handleQnaRef}
				onNavigateToSource={handleNavigateToSource}
			/>

			{imageViewer ? (
				<ImageViewerModal
					src={imageViewer.src}
					alt={imageViewer.alt}
					caption={imageViewer.caption}
					onClose={() => setImageViewer(null)}
				/>
			) : null}

			<QnAQuestionDetail
				question={qnaDetailQuestion}
				visible={qnaDetailVisible}
				onClose={() => setQnaDetailVisible(false)}
			/>
			<Modal
				visible={searchVisible}
				animationType="fade"
				onRequestClose={() => setSearchVisible(false)}
				statusBarTranslucent
			>
				<View style={[styles.searchModal, { paddingTop: insets.top }]}>
					<View style={styles.searchBar}>
						<Search size={16} color={colors.mutedForeground} strokeWidth={2} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search rules, definitions..."
							placeholderTextColor={colors.mutedForeground}
							value={searchQuery}
							onChangeText={setSearchQuery}
							autoFocus
							returnKeyType="search"
						/>
						<Pressable
							onPress={() => {
								setSearchQuery('');
								setSearchVisible(false);
								Keyboard.dismiss();
							}}
							hitSlop={8}
						>
							<X size={18} color={colors.mutedForeground} strokeWidth={2} />
						</Pressable>
					</View>

					<FlatList
						data={searchResults}
						keyExtractor={(item, i) =>
							`${item.sectionId}:${item.subsectionId}:${item.entry.code ?? item.entry.term ?? i}`
						}
						keyboardShouldPersistTaps="handled"
						renderItem={({ item }) => (
							<Pressable
								style={styles.searchResultRow}
								onPress={() => {
									setSearchVisible(false);
									setSearchQuery('');
									Keyboard.dismiss();
									const section = manual.sections.find((s) => s.id === item.sectionId) ?? null;
									setActiveSection(section);
									sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
									openRule(item.entry);
								}}
							>
								{item.entry.code ? (
									<View style={styles.resultCodeBadge}>
										<Text style={styles.resultCode}>{item.entry.code}</Text>
									</View>
								) : null}
								<View style={styles.resultText}>
									<Text style={styles.resultLabel} numberOfLines={1}>
										{item.entry.term ?? item.entry.summary ?? item.label}
									</Text>
									<Text style={styles.resultPreview} numberOfLines={2}>
										{spansText(item.entry.leadSpans)}
									</Text>
								</View>
							</Pressable>
						)}
						ListEmptyComponent={
							searchQuery.length > 0 ? (
								<View style={styles.centered}>
									<Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
								</View>
							) : (
								<View style={styles.centered}>
									<Text style={styles.emptyText}>Type to search the manual</Text>
								</View>
							)
						}
					/>
				</View>
			</Modal>
		</View>
	);
};

interface HomeViewProps {
	sections: ManualSection[];
	onSelect: (section: ManualSection) => void;
}

const HomeView = ({ sections, onSelect }: HomeViewProps) => (
	<View style={styles.homeContainer}>
		<Text style={styles.homeHeading}>Sections</Text>
		{sections.map((section) => (
			<Pressable
				key={section.id}
				style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
				onPress={() => onSelect(section)}
			>
				<View style={styles.homeCardContent}>
					<Text style={styles.homeCardTitle}>{section.title}</Text>
					<Text style={styles.homeCardMeta}>
						{section.subsections.length} subsection{section.subsections.length !== 1 ? 's' : ''}
					</Text>
				</View>
				<ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2} />
			</Pressable>
		))}
	</View>
);

interface SectionViewProps {
	section: ManualSection;
	onSelectSubsection: (sub: ManualSubsection) => void;
}

const SectionView = ({ section, onSelectSubsection }: SectionViewProps) => (
	<View style={styles.homeContainer}>
		<View style={[styles.sectionHeader, { marginBottom: spacing.md }]}>
			<View style={styles.sectionAccent} />
			<Text style={styles.sectionTitle}>{section.title}</Text>
		</View>
		{section.subsections.map((sub, si) => (
			<Pressable
				key={`${sub.id}-${si}`}
				style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
				onPress={() => onSelectSubsection(sub)}
			>
				<View style={styles.homeCardContent}>
					<Text style={styles.homeCardTitle}>{sub.title}</Text>
					<Text style={styles.homeCardMeta}>
						{sub.entries.length} {sub.entries.length === 1 ? 'entry' : 'entries'}
					</Text>
				</View>
				<ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2} />
			</Pressable>
		))}
	</View>
);

interface SubsectionDetailViewProps {
	section: ManualSection;
	subsection: ManualSubsection;
	onCrossRef: (code: string) => void;
	onQnaRef?: (id: string) => void;
	onImagePress?: (src: string, alt: string, caption?: string) => void;
	highlightEntry?: ManualEntry | null;
	scrollInnerRef?: React.RefObject<View>;
	scrollRef?: React.RefObject<ScrollView>;
	onHighlightDone?: () => void;
}

const SubsectionDetailView = ({
	section,
	subsection,
	onCrossRef,
	onQnaRef,
	onImagePress,
	highlightEntry,
	scrollInnerRef,
	scrollRef,
	onHighlightDone
}: SubsectionDetailViewProps) => (
	<View style={styles.sectionContainer}>
		<View style={styles.sectionHeader}>
			<View style={styles.sectionAccent} />
			<Text style={styles.sectionTitle}>{subsection.title}</Text>
		</View>
		<Text style={styles.subsectionSuperTitle}>{section.title}</Text>
		{subsection.entries.map((entry, i) => (
			<EntryView
				key={`${entry.code ?? entry.term ?? ''}-${i}`}
				entry={entry}
				onCrossRef={onCrossRef}
				onQnaRef={onQnaRef}
				onImagePress={onImagePress}
				highlighted={entry === highlightEntry}
				scrollInnerRef={scrollInnerRef}
				scrollRef={scrollRef}
				onHighlightDone={onHighlightDone}
			/>
		))}
	</View>
);

interface EntryViewProps {
	entry: ManualEntry;
	onCrossRef: (code: string) => void;
	onQnaRef?: (id: string) => void;
	onImagePress?: (src: string, alt: string, caption?: string) => void;
	highlighted?: boolean;
	scrollInnerRef?: React.RefObject<View>;
	scrollRef?: React.RefObject<ScrollView>;
	onHighlightDone?: () => void;
}

const EntryView = ({
	entry,
	onCrossRef,
	onQnaRef,
	onImagePress,
	highlighted,
	scrollInnerRef,
	scrollRef,
	onHighlightDone
}: EntryViewProps) => {
	const entryRef = useRef<View>(null);
	const flashAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!highlighted) return;
		const timer = setTimeout(() => {
			if (entryRef.current && scrollInnerRef?.current) {
				entryRef.current.measureLayout(
					scrollInnerRef.current,
					(_x, y) => {
						scrollRef?.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true });
					},
					() => {}
				);
			}
			flashAnim.setValue(0);
			Animated.sequence([
				Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
				Animated.delay(500),
				Animated.timing(flashAnim, { toValue: 0, duration: 700, useNativeDriver: false })
			]).start(() => onHighlightDone?.());
		}, 80);
		return () => clearTimeout(timer);
	}, [highlighted]);

	const flashBg = flashAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ['transparent', 'rgba(244,63,94,0.18)']
	});

	const hasContent =
		!!(entry.code ?? entry.term) || entry.leadSpans.length > 0 || entry.blocks.length > 0;
	if (!hasContent) return null;

	return (
		<Animated.View ref={entryRef} style={[styles.entryContainer, { backgroundColor: flashBg }]}>
			{entry.code ? (
				<View style={styles.ruleCodeBadge}>
					<Text style={styles.ruleCode}>{entry.code}</Text>
				</View>
			) : entry.term ? (
				<Text style={styles.termText}>{entry.term}</Text>
			) : null}

			{entry.summary && entry.code ? <Text style={styles.summaryText}>{entry.summary}</Text> : null}

			{entry.leadSpans.length > 0 ? (
				<InlineText
					spans={entry.leadSpans}
					onCrossRef={onCrossRef}
					onQnaRef={onQnaRef}
					style={styles.entryBody}
				/>
			) : null}

			<BlocksView
				blocks={entry.blocks}
				onCrossRef={onCrossRef}
				onQnaRef={onQnaRef}
				onImagePress={onImagePress}
			/>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.md,
		padding: spacing['2xl']
	},
	loadingText: {
		fontSize: font.base,
		color: colors.mutedForeground,
		marginBottom: spacing.sm
	},
	progressBarBg: {
		width: '80%',
		height: 6,
		backgroundColor: colors.muted,
		borderRadius: radius.full,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: colors.primary,
		borderRadius: radius.full
	},
	progressPct: {
		fontSize: font.sm,
		color: colors.mutedForeground
	},
	errorText: {
		fontSize: font.base,
		color: colors.destructive,
		textAlign: 'center'
	},
	retryBtn: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.sm,
		backgroundColor: colors.primary,
		borderRadius: radius.md
	},
	retryText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border
	},
	headerLeft: {
		gap: spacing.xs,
		flex: 1
	},
	headerTitle: {
		fontSize: font.md,
		fontWeight: '700',
		color: colors.foreground
	},
	versionBadge: {
		fontSize: font.xs,
		color: colors.mutedForeground
	},
	backBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
		flex: 1,
		marginRight: spacing.sm
	},
	backText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground,
		flex: 1
	},
	headerActions: {
		flexDirection: 'row',
		gap: spacing.sm
	},
	iconBtn: {
		padding: spacing.xs
	},
	scroll: {
		flex: 1
	},
	scrollContent: {
		paddingTop: spacing.md
	},
	homeContainer: {
		paddingHorizontal: spacing['2xl'],
		paddingTop: spacing.sm,
		gap: spacing.sm
	},
	homeHeading: {
		fontSize: font.sm,
		fontWeight: '600',
		color: colors.mutedForeground,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: spacing.xs
	},
	homeCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.card,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm
	},
	homeCardPressed: {
		opacity: 0.7
	},
	homeCardContent: {
		flex: 1,
		gap: 2
	},
	homeCardTitle: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground
	},
	homeCardMeta: {
		fontSize: font.sm,
		color: colors.mutedForeground
	},
	sectionContainer: {
		marginBottom: spacing['2xl']
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.md,
		gap: spacing.sm,
		backgroundColor: colors.card,
		marginBottom: spacing.sm
	},
	sectionAccent: {
		width: 3,
		height: 20,
		borderRadius: 2,
		backgroundColor: colors.primary
	},
	sectionTitle: {
		fontSize: font.lg,
		fontWeight: '700',
		color: colors.foreground,
		flex: 1
	},
	subsectionContainer: {
		paddingHorizontal: spacing['2xl'],
		paddingBottom: spacing.md
	},
	subsectionTitle: {
		fontSize: font.md,
		fontWeight: '600',
		color: colors.foreground,
		marginBottom: spacing.md,
		marginTop: spacing.sm
	},
	subsectionSuperTitle: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		paddingHorizontal: spacing['2xl'],
		marginTop: -spacing.sm,
		marginBottom: spacing.lg
	},
	entryContainer: {
		marginBottom: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: spacing.lg,
		paddingHorizontal: spacing['2xl']
	},
	ruleCodeBadge: {
		alignSelf: 'flex-start',
		backgroundColor: colors.primary,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
		borderRadius: radius.sm,
		marginBottom: spacing.xs
	},
	ruleCode: {
		fontSize: font.xs,
		fontWeight: '700',
		color: colors.foreground
	},
	termText: {
		fontSize: font.base,
		fontWeight: '700',
		color: colors.foreground,
		marginBottom: spacing.xs
	},
	summaryText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground,
		marginBottom: spacing.xs
	},
	entryBody: {
		fontSize: font.base,
		color: colors.foreground,
		lineHeight: 22
	},
	bodyText: {
		fontSize: font.base,
		color: colors.foreground,
		lineHeight: 22
	},
	crossRef: {
		fontSize: font.base,
		color: colors.primary,
		fontWeight: '600'
	},
	imageContainer: {
		marginTop: spacing.md,
		alignItems: 'center'
	},
	image: {
		width: '100%',
		height: 200
	},
	caption: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		textAlign: 'center',
		marginTop: spacing.xs
	},
	searchModal: {
		flex: 1,
		backgroundColor: colors.background
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.card,
		margin: spacing.lg,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: radius.md,
		gap: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border
	},
	searchInput: {
		flex: 1,
		fontSize: font.base,
		color: colors.foreground
	},
	searchResultRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		gap: spacing.sm
	},
	resultCodeBadge: {
		backgroundColor: colors.primary,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
		borderRadius: radius.sm,
		marginTop: 2
	},
	resultCode: {
		fontSize: font.xs,
		fontWeight: '700',
		color: colors.foreground
	},
	resultText: {
		flex: 1,
		gap: 2
	},
	resultLabel: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground
	},
	resultPreview: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		lineHeight: 18
	},
	emptyText: {
		fontSize: font.base,
		color: colors.mutedForeground
	},
	subsectionNav: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.sm,
		gap: spacing.lg
	},
	navBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		backgroundColor: colors.card
	},
	navBtnRight: {
		justifyContent: 'flex-end'
	},
	navBtnPressed: {
		opacity: 0.6
	},
	navBtnText: {
		flex: 1,
		fontSize: font.sm,
		color: colors.mutedForeground,
		fontWeight: '500'
	}
});
