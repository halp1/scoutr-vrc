import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import type { Block, InlineSegment, ListItem } from './gameManual';

const toRoman = (n: number): string => {
	const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
	const syms = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];
	let result = '';
	for (let i = 0; i < vals.length; i++) {
		while (n >= vals[i]) {
			result += syms[i];
			n -= vals[i];
		}
	}
	return result;
};

interface CrossRefProps {
	onCrossRef?: (id: string) => void;
	onImagePress?: (src: string, alt: string, caption?: string) => void;
}

export const InlineText = ({
	spans,
	onCrossRef,
	style
}: CrossRefProps & { spans: InlineSegment[]; style?: object }) => (
	<Text style={style}>
		{spans.map((seg, i) => {
			if (seg.t === 'ref') {
				return (
					<Text key={i} style={styles.refText} onPress={() => onCrossRef?.(seg.id)}>
						{seg.s}
					</Text>
				);
			}
			if (seg.t === 'bold')
				return (
					<Text key={i} style={styles.boldText}>
						{seg.s}
					</Text>
				);
			if (seg.t === 'italic')
				return (
					<Text key={i} style={styles.italicText}>
						{seg.s}
					</Text>
				);
			return <Text key={i}>{seg.s}</Text>;
		})}
	</Text>
);

export const BlocksView = ({
	blocks,
	onCrossRef,
	onImagePress
}: CrossRefProps & { blocks: Block[] }) => (
	<>
		{blocks.map((block, i) => (
			<BlockView key={i} block={block} onCrossRef={onCrossRef} onImagePress={onImagePress} />
		))}
	</>
);

const BlockView = ({ block, onCrossRef, onImagePress }: CrossRefProps & { block: Block }) => {
	switch (block.type) {
		case 'paragraph':
			return <InlineText spans={block.spans} onCrossRef={onCrossRef} style={styles.paragraph} />;
		case 'note':
			return (
				<View style={styles.noteContainer}>
					<InlineText spans={block.spans} onCrossRef={onCrossRef} style={styles.noteText} />
				</View>
			);
		case 'list':
			return (
				<View style={styles.listContainer}>
					{block.items.map((item, i) => (
						<ListItemView key={i} item={item} index={i} depth={0} onCrossRef={onCrossRef} />
					))}
				</View>
			);
		case 'figure':
			return (
				<View style={styles.figureContainer}>
					<Pressable
						onPress={() => onImagePress?.(block.src, block.alt, block.caption || undefined)}
						disabled={!onImagePress}
						style={{ width: '100%' }}
					>
						<Image
							source={{ uri: block.src }}
							style={styles.figureImage}
							resizeMode="contain"
							accessibilityLabel={block.alt}
						/>
					</Pressable>
					{block.caption ? <Text style={styles.figureCaption}>{block.caption}</Text> : null}
				</View>
			);
		case 'redbox':
			return (
				<View style={styles.redbox}>
					<BlocksView blocks={block.blocks} onCrossRef={onCrossRef} onImagePress={onImagePress} />
				</View>
			);
		case 'greybox':
			return (
				<View style={styles.greybox}>
					<BlocksView blocks={block.blocks} onCrossRef={onCrossRef} onImagePress={onImagePress} />
				</View>
			);
		case 'vexubox':
			return (
				<View style={styles.vexubox}>
					<BlocksView blocks={block.blocks} onCrossRef={onCrossRef} onImagePress={onImagePress} />
				</View>
			);
		case 'table':
			return <TableView headers={block.headers} rows={block.rows} />;
		default:
			return null;
	}
};

const ListItemView = ({
	item,
	index,
	depth,
	onCrossRef
}: CrossRefProps & { item: ListItem; index: number; depth: number }) => {
	let marker: string;
	switch (item.cls) {
		case 'numbers':
			marker = `${index + 1}.`;
			break;
		case 'alphabullet':
			marker = `${String.fromCharCode(97 + index)}.`;
			break;
		case 'romanbullet':
			marker = `${toRoman(index + 1)}.`;
			break;
		case 'subbullet':
			marker = '◦';
			break;
		case 'subsubbullet':
			marker = '▪';
			break;
		default:
			marker = '•';
	}

	return (
		<View>
			<View style={[styles.listItemRow, { paddingLeft: depth * 16 }]}>
				<Text style={[styles.listMarker, item.violations && styles.violationText]}>{marker}</Text>
				<InlineText
					spans={item.spans}
					onCrossRef={onCrossRef}
					style={[styles.listItemText, item.violations && styles.violationText]}
				/>
			</View>
			{item.children.map((child, i) => (
				<ListItemView key={i} item={child} index={i} depth={depth + 1} onCrossRef={onCrossRef} />
			))}
		</View>
	);
};

const TableView = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
	<ScrollView horizontal style={styles.tableScroll}>
		<View>
			{headers.length > 0 && (
				<View style={styles.tableHeaderRow}>
					{headers.map((h, i) => (
						<View key={i} style={styles.tableCell}>
							<Text style={styles.tableHeaderText}>{h}</Text>
						</View>
					))}
				</View>
			)}
			{rows.map((row, ri) => (
				<View key={ri} style={[styles.tableRow, ri % 2 === 1 && styles.tableRowAlt]}>
					{row.map((cell, ci) => (
						<View key={ci} style={styles.tableCell}>
							<Text style={styles.tableCellText}>{cell}</Text>
						</View>
					))}
				</View>
			))}
		</View>
	</ScrollView>
);

const styles = StyleSheet.create({
	paragraph: {
		color: colors.foreground,
		fontSize: 14,
		lineHeight: 22,
		marginBottom: 8
	},
	noteContainer: {
		borderLeftWidth: 2,
		borderLeftColor: colors.mutedForeground,
		paddingLeft: 10,
		marginVertical: 6
	},
	noteText: {
		color: colors.mutedForeground,
		fontSize: 13,
		fontStyle: 'italic',
		lineHeight: 20
	},
	listContainer: {
		marginBottom: 8
	},
	listItemRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 4
	},
	listMarker: {
		color: colors.foreground,
		fontSize: 14,
		lineHeight: 22,
		width: 20,
		flexShrink: 0
	},
	listItemText: {
		color: colors.foreground,
		fontSize: 14,
		lineHeight: 22,
		flex: 1
	},
	violationText: {
		color: colors.destructive
	},
	figureContainer: {
		alignItems: 'center',
		marginVertical: 10
	},
	figureImage: {
		width: '100%',
		height: 200
	},
	figureCaption: {
		color: colors.mutedForeground,
		fontSize: 12,
		marginTop: 4,
		textAlign: 'center'
	},
	redbox: {
		borderLeftWidth: 3,
		borderLeftColor: colors.destructive,
		backgroundColor: 'rgba(239,68,68,0.08)',
		borderRadius: 6,
		padding: 12,
		marginVertical: 8
	},
	greybox: {
		borderLeftWidth: 3,
		borderLeftColor: colors.mutedForeground,
		backgroundColor: colors.muted,
		borderRadius: 6,
		padding: 12,
		marginVertical: 8
	},
	vexubox: {
		borderLeftWidth: 3,
		borderLeftColor: colors.blue,
		backgroundColor: 'rgba(147,197,253,0.08)',
		borderRadius: 6,
		padding: 12,
		marginVertical: 8
	},
	refText: {
		color: colors.blue
	},
	boldText: {
		fontWeight: 'bold'
	},
	italicText: {
		fontStyle: 'italic'
	},
	tableScroll: {
		marginVertical: 8
	},
	tableHeaderRow: {
		flexDirection: 'row',
		backgroundColor: colors.muted
	},
	tableRow: {
		flexDirection: 'row'
	},
	tableRowAlt: {
		backgroundColor: 'rgba(255,255,255,0.04)'
	},
	tableCell: {
		minWidth: 100,
		borderWidth: 0.5,
		borderColor: colors.border,
		padding: 6
	},
	tableHeaderText: {
		color: colors.foreground,
		fontSize: 13,
		fontWeight: 'bold'
	},
	tableCellText: {
		color: colors.foreground,
		fontSize: 13
	}
});
