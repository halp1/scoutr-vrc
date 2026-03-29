import { Tabs } from 'expo-router';
import { House, Compass, Star, User2, Wrench } from 'lucide-react-native';
import { colors } from '../../lib/theme';

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: colors.background,
					borderTopColor: colors.border,
					borderTopWidth: 1,
					height: 72
				},
				tabBarItemStyle: {
					paddingVertical: 8
				},
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.mutedForeground,
				tabBarShowLabel: false
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					tabBarIcon: ({ color, size }) => (
						<House size={size} color={color} strokeWidth={color === colors.primary ? 2 : 1.5} />
					)
				}}
			/>
			<Tabs.Screen
				name="favorites"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Star size={size} color={color} strokeWidth={color === colors.primary ? 2 : 1.5} />
					)
				}}
			/>
			<Tabs.Screen
				name="explore"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Compass size={size} color={color} strokeWidth={color === colors.primary ? 2 : 1.5} />
					)
				}}
			/>
			<Tabs.Screen
				name="tools"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Wrench size={size} color={color} strokeWidth={color === colors.primary ? 2 : 1.5} />
					)
				}}
			/>
			<Tabs.Screen
				name="account"
				options={{
					tabBarIcon: ({ color, size }) => (
						<User2 size={size} color={color} strokeWidth={color === colors.primary ? 2 : 1.5} />
					)
				}}
			/>
		</Tabs>
	);
}
