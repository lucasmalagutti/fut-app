import { Tabs } from 'expo-router';
import { CalendarDays, LayoutDashboard, MessageCircle, User, Wallet } from 'lucide-react-native';
import { colors } from '../../theme';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courts/index"
        options={{
          title: 'Quadras',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finanças',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Mensagens',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Hide nested screens */}
      <Tabs.Screen name="courts/new" options={{ href: null }} />
      <Tabs.Screen name="courts/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[threadId]" options={{ href: null }} />
    </Tabs>
  );
}
