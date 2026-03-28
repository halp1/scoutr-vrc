import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
	clearManualCache,
	getManual,
	isManualCached,
	isManualPersistedAsync,
	type ManualData
} from './gameManual';
import {
	cacheAllImages,
	getNetworkStatus,
	initImageCache,
	syncQnaQuestions,
	type QnaQuestion
} from './qnaData';

interface ToolsDataContextValue {
	manual: ManualData | null;
	isManualLoading: boolean;
	manualProgress: number;
	manualProgressLabel: string;
	manualError: string | null;
	retryManual: () => void;
	isCellularBlocked: boolean;
	loadManualOnCellular: () => void;
	forceRefreshManual: () => void;
	questions: QnaQuestion[];
	isQnaLoading: boolean;
	isQnaRefreshing: boolean;
	qnaWarning: string | null;
	qnaLastSync: number;
	qnaFromCache: boolean;
	refreshQna: () => void;
	imageProgress: { done: number; total: number } | null;
	vpnPending: QnaQuestion[] | null;
	dismissVpn: () => void;
	confirmVpnDownload: () => void;
}

const ToolsDataContext = createContext<ToolsDataContextValue | null>(null);

export const useToolsData = (): ToolsDataContextValue => {
	const ctx = useContext(ToolsDataContext);
	if (!ctx) throw new Error('useToolsData must be used inside ToolsDataProvider');
	return ctx;
};

export const ToolsDataProvider = ({ children }: { children: React.ReactNode }) => {
	const [manual, setManual] = useState<ManualData | null>(null);
	const [isManualLoading, setIsManualLoading] = useState(true);
	const [manualProgress, setManualProgress] = useState(0);
	const [manualProgressLabel, setManualProgressLabel] = useState('Connecting...');
	const [manualError, setManualError] = useState<string | null>(null);
	const [isCellularBlocked, setIsCellularBlocked] = useState(false);

	const [questions, setQuestions] = useState<QnaQuestion[]>([]);
	const [isQnaLoading, setIsQnaLoading] = useState(true);
	const [isQnaRefreshing, setIsQnaRefreshing] = useState(false);
	const [qnaWarning, setQnaWarning] = useState<string | null>(null);
	const [qnaLastSync, setQnaLastSync] = useState(0);
	const [qnaFromCache, setQnaFromCache] = useState(false);
	const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);
	const [vpnPending, setVpnPending] = useState<QnaQuestion[] | null>(null);
	const imageProgressRef = useRef(setImageProgress);
	imageProgressRef.current = setImageProgress;

	const loadManual = useCallback(async (skipNetworkCheck = false) => {
		if (!skipNetworkCheck && !isManualCached()) {
			const isPersisted = await isManualPersistedAsync();
			if (!isPersisted) {
				const { isWifi } = await getNetworkStatus();
				if (!isWifi) {
					setIsCellularBlocked(true);
					setIsManualLoading(false);
					return;
				}
			}
		}
		setIsCellularBlocked(false);
		setIsManualLoading(true);
		setManualProgress(0);
		setManualError(null);
		try {
			const data = await getManual((p, label) => {
				setManualProgress(p);
				setManualProgressLabel(label);
			});
			setManual(data);
		} catch (e: unknown) {
			setManualError((e as Error)?.message ?? 'Failed to load game manual.');
		} finally {
			setIsManualLoading(false);
		}
	}, []);

	const loadQna = useCallback(async (forceRefresh = false) => {
		if (forceRefresh) {
			setIsQnaRefreshing(true);
			setImageProgress(null);
		} else {
			setIsQnaLoading(true);
		}
		const result = await syncQnaQuestions(forceRefresh);
		setQuestions(result.questions);
		setQnaWarning(result.warning);
		setQnaLastSync(result.lastSync);
		setQnaFromCache(result.fromCache);
		setIsQnaRefreshing(false);
		setIsQnaLoading(false);
		if (result.questions.length > 0) {
			initImageCache(result.questions);
			const { isWifi, isVpn } = await getNetworkStatus();
			if (isVpn) {
				setVpnPending(result.questions);
			} else if (isWifi) {
				void cacheAllImages(result.questions, (done, total) => {
					imageProgressRef.current({ done, total });
				});
			}
		}
	}, []);

	useEffect(() => {
		void loadManual();
		void loadQna(false);
	}, [loadManual, loadQna]);

	const retryManual = useCallback(() => void loadManual(), [loadManual]);
	const loadManualOnCellular = useCallback(() => void loadManual(true), [loadManual]);
	const forceRefreshManual = useCallback(async () => {
		await clearManualCache();
		setManual(null);
		void loadManual(true);
	}, [loadManual]);
	const refreshQna = useCallback(() => void loadQna(true), [loadQna]);

	const dismissVpn = useCallback(() => setVpnPending(null), []);
	const confirmVpnDownload = useCallback(() => {
		const qs = vpnPending;
		setVpnPending(null);
		if (qs) {
			void cacheAllImages(qs, (done, total) => {
				imageProgressRef.current({ done, total });
			});
		}
	}, [vpnPending]);

	return (
		<ToolsDataContext.Provider
			value={{
				manual,
				isManualLoading,
				manualProgress,
				manualProgressLabel,
				manualError,
				retryManual,
				isCellularBlocked,
				loadManualOnCellular,
				forceRefreshManual,
				questions,
				isQnaLoading,
				isQnaRefreshing,
				qnaWarning,
				qnaLastSync,
				qnaFromCache,
				refreshQna,
				imageProgress,
				vpnPending,
				dismissVpn,
				confirmVpnDownload
			}}
		>
			{children}
		</ToolsDataContext.Provider>
	);
};
