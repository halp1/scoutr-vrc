import { useState, useEffect, useRef, useCallback } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	Modal,
	Pressable,
	Platform,
	KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	Search,
	SlidersHorizontal,
	X
} from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { re } from '../../lib/robotevents';
import type { SearchEvent, EventRegion, EventDate } from '../../lib/robotevents/events';
import { PaginatedEventFromJSON } from '../../lib/robotevents/robotevents/models';
import { TeamProfileView } from '../../lib/components/TeamProfileView';
import { useStorage } from '../../lib/state/storage';
import { CONSTANTS } from '../../lib/const';

type SearchType = 'all' | 'teams' | 'events';

const toEventDate = (d: Date): EventDate => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}` as EventDate;
};

const oneYearAgo = () => {
	const d = new Date();
	d.setFullYear(d.getFullYear() - 1);
	return d;
};

const oneYearAhead = () => {
	const d = new Date();
	d.setFullYear(d.getFullYear() + 1);
	return d;
};

const formatDate = (d: Date) =>
	d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function ExploreScreen() {
	const { program: programId } = useStorage();
	const insets = useSafeAreaInsets();

	const [query, setQuery] = useState('');
	const [type, setType] = useState<SearchType>('all');
	const [region, setRegion] = useState<string>('');
	const [fromDate, setFromDate] = useState<Date>(oneYearAgo());
	const [toDate, setToDate] = useState<Date>(oneYearAhead());
	const [filterOpen, setFilterOpen] = useState(false);
	const [regionSearch, setRegionSearch] = useState('');
	const [eventsPage, setEventsPage] = useState(1);

	const [programs, setPrograms] = useState<{ id: number; abbr: string }[]>([]);
	const [program, setProgram] = useState<number>(programId ?? 1);
	const [season, setSeason] = useState<number | null>(null);
	const [regions, setRegions] = useState<EventRegion[]>([]);

	const [teams, setTeams] = useState<{ id: number }[] | null>(null);
	const [events, setEvents] = useState<SearchEvent[] | null>(null);
	const [totalPages, setTotalPages] = useState(1);
	const [loadPageFn, setLoadPageFn] = useState<((page: number) => Promise<SearchEvent[]>) | null>(
		null
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const progs = (
				await re.depaginate(
					re.program.programGetPrograms({}, re.custom.maxPages),
					re.models.PaginatedProgramFromJSON
				)
			).filter((p) => CONSTANTS.SUPPORTED_PROGRAMS.includes(p.abbr!));

			if (cancelled) return;
			setPrograms(progs.map((p) => ({ id: p.id!, abbr: p.abbr! })));

			const prog =
				progs.find((p) => p.id === programId) ?? progs.find((p) => p.abbr === 'V5RC') ?? progs[0];
			if (!prog) return;
			setProgram(prog.id!);

			const seasons = await re.depaginate(
				re.season.seasonGetSeasons({ program: [prog.id!] }, re.custom.maxPages),
				re.models.PaginatedSeasonFromJSON
			);
			if (cancelled || seasons.length === 0) return;
			const latestSeason = seasons.reduce((a, b) => (a.end! > b.end! ? a : b));
			setSeason(latestSeason.id!);

			const regs = await re.custom.events.loadEventRegions(latestSeason.id!);
			if (!cancelled) setRegions(regs);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const doSearch = useCallback(
		(
			q: string,
			t: SearchType,
			prog: number,
			seas: number | null,
			reg: string,
			from: Date,
			to: Date
		) => {
			if (q.length < 3 || !seas) {
				setTeams(null);
				setEvents(null);
				setLoading(false);
				return;
			}

			let cancelled = false;
			setLoading(true);
			setError(null);
			setEventsPage(1);

			(async () => {
				const teamsPromise =
					t === 'all' || t === 'teams'
						? re
								.depaginate(
									re.team.teamGetTeams({ number: [q], program: [prog] }),
									re.models.PaginatedTeamFromJSON
								)
								.then((teams) => teams.map((t) => ({ id: t.id! })))
						: Promise.resolve(null);

				const eventsPromise =
					t === 'all' || t === 'events'
						? re.custom.events.getEvents(
								{
									name: q,
									season: seas,
									eventRegion: reg ? parseInt(reg) : undefined,
									from: toEventDate(from),
									to: toEventDate(to)
								},
								() => cancelled
							)
						: Promise.resolve(null);

				try {
					const [teamRes, eventRes] = await Promise.allSettled([teamsPromise, eventsPromise]);

					if (cancelled) return;

					if (teamRes.status === 'fulfilled') setTeams(teamRes.value);
					else setError((teamRes.reason as Error).message);

					if (eventRes.status === 'fulfilled' && eventRes.value) {
						setEvents(eventRes.value.events);
						setTotalPages(eventRes.value.pages);
						setLoadPageFn(() => eventRes.value!.loadPage);
					} else if (eventRes.status === 'fulfilled' && !eventRes.value) {
						setEvents(null);
					} else if (
						eventRes.status === 'rejected' &&
						(teamRes.status === 'rejected' || (teamRes.value ?? []).length === 0)
					) {
						setError((eventRes.reason as Error).message);
					}
				} finally {
					if (!cancelled) setLoading(false);
				}
			})();

			return () => {
				cancelled = true;
			};
		},
		[]
	);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			doSearch(query, type, program, season, region, fromDate, toDate);
		}, 500);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, type, program, season, region, fromDate, toDate]);

	const loadPage = async (page: number) => {
		if (!loadPageFn) return;
		setLoading(true);
		setEventsPage(page);
		try {
			const results = await loadPageFn(page);
			setEvents(results);
		} finally {
			setLoading(false);
		}
	};

	const navigateToEvent = async (sku: string) => {
		try {
			const results = await re.depaginate(
				re.events.eventGetEvents({ sku: [sku] }),
				PaginatedEventFromJSON
			);
			const eventId = results[0]?.id;
			if (eventId) router.push(`/events/${eventId}`);
		} catch {
			// ignore navigation errors
		}
	};

	const hasResults = (teams?.length ?? 0) + (events?.length ?? 0) > 0;

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<View style={styles.header}>
				<Text style={styles.heading}>Explore</Text>
				<View style={styles.searchRow}>
					<View style={styles.searchBox}>
						<Search size={16} color={colors.mutedForeground} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search teams or events..."
							placeholderTextColor={colors.mutedForeground}
							value={query}
							onChangeText={setQuery}
							autoCapitalize="characters"
							returnKeyType="search"
						/>
						{query.length > 0 && (
							<TouchableOpacity onPress={() => setQuery('')}>
								<X size={16} color={colors.mutedForeground} />
							</TouchableOpacity>
						)}
					</View>
					<TouchableOpacity
						style={styles.filterBtn}
						onPress={() => {
							setRegionSearch('');
							setFilterOpen(true);
						}}
					>
						<SlidersHorizontal size={18} color={region ? colors.primary : colors.foreground} />
					</TouchableOpacity>
				</View>

				<View style={styles.typeRow}>
					{(['all', 'teams', 'events'] as SearchType[]).map((t) => (
						<TouchableOpacity
							key={t}
							style={[styles.typeBtn, type === t && styles.typeBtnActive]}
							onPress={() => setType(t)}
						>
							<Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
								{t.charAt(0).toUpperCase() + t.slice(1)}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				{loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

				{error && !loading && (
					<View style={styles.errorBox}>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				{!loading && query.length >= 3 && !hasResults && !error && (
					<Text style={styles.empty}>No results for "{query}"</Text>
				)}

				{teams && teams.length > 0 && (
					<View style={styles.section}>
						{teams.map((team) => (
							<View key={team.id} style={{ marginBottom: 24 }}>
								<TeamProfileView teamId={team.id} />
							</View>
						))}
					</View>
				)}

				{!(teams && teams.length > 0) && events && events.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionLabel}>Events</Text>
						{events.map((event, i) => (
							<TouchableOpacity
								key={`${event.sku}-${i}`}
								style={[styles.card, { marginBottom: 8 }]}
								onPress={() => navigateToEvent(event.sku)}
							>
								<View style={styles.cardRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.eventName} numberOfLines={2}>
											{event.name}
										</Text>
										{event.location && (
											<Text style={styles.meta}>
												{[event.location.city, event.location.state].filter(Boolean).join(', ')}
											</Text>
										)}
										{event.date.length > 0 && (
											<Text style={styles.meta}>{formatDate(event.date[0])}</Text>
										)}
									</View>
									<ArrowRight size={16} color={colors.mutedForeground} />
								</View>
							</TouchableOpacity>
						))}

						{totalPages > 1 && (
							<View style={styles.paginationRow}>
								<TouchableOpacity
									style={[styles.pageBtn, eventsPage === 1 && styles.pageBtnDisabled]}
									onPress={() => eventsPage > 1 && loadPage(eventsPage - 1)}
									disabled={eventsPage === 1}
								>
									<ChevronLeft
										size={18}
										color={eventsPage === 1 ? colors.mutedForeground : colors.foreground}
									/>
								</TouchableOpacity>
								<Text style={styles.pageText}>
									{eventsPage} / {totalPages}
								</Text>
								<TouchableOpacity
									style={[styles.pageBtn, eventsPage === totalPages && styles.pageBtnDisabled]}
									onPress={() => eventsPage < totalPages && loadPage(eventsPage + 1)}
									disabled={eventsPage === totalPages}
								>
									<ChevronRight
										size={18}
										color={eventsPage === totalPages ? colors.mutedForeground : colors.foreground}
									/>
								</TouchableOpacity>
							</View>
						)}
					</View>
				)}
			</ScrollView>

			<Modal
				visible={filterOpen}
				transparent
				statusBarTranslucent
				animationType="slide"
				onRequestClose={() => setFilterOpen(false)}
			>
				<View style={styles.modalContainer}>
					<Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
					<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
						<View style={styles.sheetHandle} />
						<Text style={styles.sheetTitle}>Filters</Text>
						<Text style={styles.filterLabel}>From date</Text>
						<View style={styles.dateRow}>
							<TouchableOpacity
								style={styles.dateArrow}
								onPress={() => {
									const d = new Date(fromDate);
									d.setMonth(d.getMonth() - 1);
									if (d < toDate) setFromDate(d);
								}}
							>
								<ChevronLeft size={18} color={colors.foreground} />
							</TouchableOpacity>
							<Text style={styles.dateText}>{formatDate(fromDate)}</Text>
							<TouchableOpacity
								style={styles.dateArrow}
								onPress={() => {
									const d = new Date(fromDate);
									d.setMonth(d.getMonth() + 1);
									if (d < toDate) setFromDate(d);
								}}
							>
								<ChevronRight size={18} color={colors.foreground} />
							</TouchableOpacity>
						</View>

						<Text style={[styles.filterLabel, { marginTop: 12 }]}>To date</Text>
						<View style={[styles.dateRow, { marginBottom: 16 }]}>
							<TouchableOpacity
								style={styles.dateArrow}
								onPress={() => {
									const d = new Date(toDate);
									d.setMonth(d.getMonth() - 1);
									if (d > fromDate) setToDate(d);
								}}
							>
								<ChevronLeft size={18} color={colors.foreground} />
							</TouchableOpacity>
							<Text style={styles.dateText}>{formatDate(toDate)}</Text>
							<TouchableOpacity
								style={styles.dateArrow}
								onPress={() => {
									const d = new Date(toDate);
									d.setMonth(d.getMonth() + 1);
									if (d > fromDate) setToDate(d);
								}}
							>
								<ChevronRight size={18} color={colors.foreground} />
							</TouchableOpacity>
						</View>
						<Text style={styles.filterLabel}>Region</Text>
						<View style={styles.regionDropdown}>
							<View style={styles.regionSearch}>
								<Search size={14} color={colors.mutedForeground} />
								<TextInput
									style={styles.regionSearchInput}
									placeholder="Search regions..."
									placeholderTextColor={colors.mutedForeground}
									value={regionSearch}
									onChangeText={setRegionSearch}
									autoCapitalize="none"
								/>
								{regionSearch.length > 0 && (
									<TouchableOpacity onPress={() => setRegionSearch('')}>
										<X size={14} color={colors.mutedForeground} />
									</TouchableOpacity>
								)}
							</View>
							<FlatList
								data={[{ id: 0, name: 'All' }, ...regions].filter((r) =>
									r.name.toLowerCase().includes(regionSearch.toLowerCase())
								)}
								keyExtractor={(r) => String(r.id)}
								style={styles.regionList}
								keyboardShouldPersistTaps="handled"
								renderItem={({ item: r }) => {
									const active = r.id === 0 ? !region : region === String(r.id);
									return (
										<TouchableOpacity
											style={[styles.regionItem, active && styles.regionItemActive]}
											onPress={() => setRegion(r.id === 0 ? '' : String(r.id))}
										>
											<Text style={[styles.regionItemText, active && styles.regionItemTextActive]}>
												{r.name}
											</Text>
										</TouchableOpacity>
									);
								}}
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.typeBtn,
								styles.typeBtnActive,
								{ alignSelf: 'flex-start', marginTop: 8 }
							]}
							onPress={() => setFilterOpen(false)}
						>
							<Text style={styles.typeBtnTextActive}>Apply</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	header: { padding: spacing.md, paddingBottom: 8 },
	heading: { fontSize: font['2xl'], fontWeight: '600', color: colors.foreground, marginBottom: 12 },
	searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
	searchBox: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 12,
		paddingVertical: Platform.OS === 'ios' ? 10 : 6
	},
	searchInput: { flex: 1, color: colors.foreground, fontSize: font.base },
	filterBtn: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	typeRow: { flexDirection: 'row', gap: 8 },
	typeBtn: {
		paddingHorizontal: 16,
		paddingVertical: 7,
		borderRadius: radius.full,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card
	},
	typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
	typeBtnText: { fontSize: font.sm, color: colors.mutedForeground },
	typeBtnTextActive: { color: '#fff', fontWeight: '500' },
	scroll: { flex: 1 },
	content: { paddingHorizontal: spacing.md, paddingBottom: spacing['3xl'] },
	section: { marginBottom: spacing.xl },
	sectionLabel: {
		fontSize: font.sm,
		fontWeight: '500',
		color: colors.mutedForeground,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 8
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md
	},
	cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	eventName: { fontSize: font.base, fontWeight: '500', color: colors.foreground },
	meta: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	empty: { textAlign: 'center', color: colors.mutedForeground, marginTop: 32 },
	errorBox: {
		backgroundColor: colors.destructive + '20',
		borderRadius: radius.md,
		padding: spacing.md,
		marginTop: 16
	},
	errorText: { color: colors.destructive },
	paginationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		marginTop: 12
	},
	pageBtn: {
		width: 36,
		height: 36,
		borderRadius: radius.md,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center'
	},
	pageBtnDisabled: { opacity: 0.4 },
	pageText: { fontSize: font.sm, color: colors.foreground },
	modalContainer: { flex: 1, justifyContent: 'flex-end' as const },
	backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
	sheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.lg,
		maxHeight: '70%'
	},
	sheetHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border,
		alignSelf: 'center',
		marginBottom: 16
	},
	sheetTitle: { fontSize: font.xl, fontWeight: '600', color: colors.foreground, marginBottom: 16 },
	filterLabel: { fontSize: font.sm, color: colors.mutedForeground, marginBottom: 8 },
	regionDropdown: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		backgroundColor: colors.background,
		overflow: 'hidden',
		marginBottom: 16
	},
	regionSearch: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.border
	},
	regionSearchInput: { flex: 1, color: colors.foreground, fontSize: font.sm },
	regionList: { maxHeight: 220 },
	regionItem: {
		paddingHorizontal: 14,
		paddingVertical: 11,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border
	},
	regionItemActive: { backgroundColor: colors.primary + '20' },
	regionItemText: { fontSize: font.sm, color: colors.foreground },
	regionItemTextActive: { color: colors.primary, fontWeight: '600' },
	dateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		paddingHorizontal: 8,
		paddingVertical: 6,
		marginBottom: 4
	},
	dateArrow: {
		padding: 6,
		borderRadius: radius.md,
		backgroundColor: colors.card
	},
	dateText: { fontSize: font.sm, color: colors.foreground, fontWeight: '500' },
	pill: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: radius.full,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.background
	},
	pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
	pillText: { fontSize: font.sm, color: colors.foreground },
	pillTextActive: { color: '#fff', fontWeight: '500' }
});
