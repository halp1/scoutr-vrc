import { useState, useEffect, useRef, useCallback } from 'react';
import {
	View,
	Text,
	ScrollView,
	Pressable,
	Image,
	TextInput,
	ActivityIndicator,
	FlatList,
	Modal,
	StyleSheet,
	Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, List, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';
import {
	getManual,
	type ManualEntry,
	type ManualSection,
	type ManualSubsection
} from './gameManual';
import { ManualToC } from './ManualToC';
import { RuleDrawer } from './RuleDrawer';

const INLINE_RULE_SPLIT = /(<[A-Z]+\d+[A-Za-z]*>)/g;

const renderBodyInline = (body: string, onCrossRef: (code: string) => void): React.ReactNode[] =>
	body.split(INLINE_RULE_SPLIT).map((part, i) => {
		const match = part.match(/^<([A-Z]+\d+[A-Za-z]*)>$/);
		if (match) {
			return (
				<Text key={i} style={styles.crossRef} onPress={() => onCrossRef(match[1])}>
					{part}
				</Text>
			);
		}
		return (
			<Text key={i} style={styles.bodyText}>
				{part}
			</Text>
		);
	});

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
			r.entry.body.toLowerCase().includes(q) ||
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
	const [error, setError] = useState<string | null>(null);
	const [activeSection, setActiveSection] = useState<ManualSection | null>(null);
	const [tocVisible, setTocVisible] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [ruleDrawerEntry, setRuleDrawerEntry] = useState<ManualEntry | null>(null);
	const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);

	const sectionScrollRef = useRef<ScrollView>(null);
	const searchIndexRef = useRef<SearchResult[]>([]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await getManual();
			setManual(data);
			searchIndexRef.current = buildSearchIndex(data.sections);
		} catch (e: any) {
			setError(e?.message ?? 'Failed to load game manual.');
		} finally {
			setLoading(false);
		}
	}, []);

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
			const entry = manual.ruleMap[code];
			if (entry) setRuleDrawerEntry(entry);
		},
		[manual]
	);

	const handleTocSelect = useCallback(
		(sectionId: string) => {
			if (!manual) return;
			const section = manual.sections.find((s) => s.id === sectionId) ?? null;
			setActiveSection(section);
			setTocVisible(false);
			sectionScrollRef.current?.scrollTo({ y: 0, animated: false });
		},
		[manual]
	);

	const searchResults = searchVisible ? searchEntries(searchIndexRef.current, searchQuery) : [];

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={styles.loadingText}>Loading manual...</Text>
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
					<Pressable style={styles.backBtn} onPress={() => setActiveSection(null)} hitSlop={8}>
						<ChevronLeft size={20} color={colors.foreground} strokeWidth={2} />
						<Text style={styles.backText} numberOfLines={1}>
							{activeSection.title}
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

			{activeSection ? (
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
						onCrossRef={(code) => {
							const entry = manual.ruleMap[code];
							if (entry) openRule(entry);
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
										{item.entry.body}
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
	onCrossRef: (code: string) => void;
}

const SectionView = ({ section, onCrossRef }: SectionViewProps) => (
	<View style={styles.sectionContainer}>
		<View style={styles.sectionHeader}>
			<View style={styles.sectionAccent} />
			<Text style={styles.sectionTitle}>{section.title}</Text>
		</View>
		{section.subsections.map((sub, si) => (
			<SubsectionView
				key={`${section.id}:${sub.id}:${si}`}
				subsection={sub}
				onCrossRef={onCrossRef}
			/>
		))}
	</View>
);

interface SubsectionViewProps {
	subsection: ManualSubsection;
	onCrossRef: (code: string) => void;
}

const SubsectionView = ({ subsection, onCrossRef }: SubsectionViewProps) => (
	<View style={styles.subsectionContainer}>
		<Text style={styles.subsectionTitle}>{subsection.title}</Text>
		{subsection.entries.map((entry, i) => (
			<EntryView
				key={`${entry.code ?? entry.term ?? ''}-${i}`}
				entry={entry}
				onCrossRef={onCrossRef}
			/>
		))}
	</View>
);

interface EntryViewProps {
	entry: ManualEntry;
	onCrossRef: (code: string) => void;
}

const EntryView = ({ entry, onCrossRef }: EntryViewProps) => {
	const hasContent = !!(entry.code ?? entry.term ?? entry.body);
	if (!hasContent && entry.images.length === 0) return null;

	return (
		<View style={styles.entryContainer}>
			{entry.code ? (
				<View style={styles.ruleCodeBadge}>
					<Text style={styles.ruleCode}>{entry.code}</Text>
				</View>
			) : entry.term ? (
				<Text style={styles.termText}>{entry.term}</Text>
			) : null}

			{entry.summary && entry.code ? <Text style={styles.summaryText}>{entry.summary}</Text> : null}

			{entry.body ? (
				<Text style={styles.entryBody}>{renderBodyInline(entry.body, onCrossRef)}</Text>
			) : null}

			{entry.images.map((img, i) => (
				<View key={i} style={styles.imageContainer}>
					<Image source={{ uri: img.src }} style={styles.image} resizeMode="contain" />
					{img.caption ? <Text style={styles.caption}>{img.caption}</Text> : null}
				</View>
			))}
		</View>
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
	entryContainer: {
		marginBottom: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: spacing.lg
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
	}
});
