import { View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing } from '../../theme';

export const TimerTab = () => {
	return (
		<View style={styles.container}>
			<Text style={styles.placeholder}>Timer</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing['3xl']
	},
	placeholder: {
		fontSize: font.base,
		color: colors.mutedForeground
	}
});
