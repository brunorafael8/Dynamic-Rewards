import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Card, H2, Text, Badge, Spinner, Button } from 'tamagui';
import { fetchRules, RewardRule } from '../../lib/api';
import { useRouter } from 'expo-router';

function RuleCard({ rule }: { rule: RewardRule }) {
  return (
    <Card
      elevate
      size="$4"
      bordered
      marginBottom="$3"
      pressStyle={{ scale: 0.98 }}
      animation="bouncy"
      backgroundColor="$backgroundStrong"
    >
      <Card.Header>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1} marginRight="$2">
            <Text fontSize="$6" fontWeight="600" color="$color">
              {rule.name}
            </Text>
            {rule.description && (
              <Text fontSize="$3" color="$colorFocus" marginTop="$1">
                {rule.description}
              </Text>
            )}
          </YStack>
          <Badge
            backgroundColor={rule.active ? '#10B981' : '$borderColor'}
            color={rule.active ? 'white' : '$colorFocus'}
          >
            {rule.active ? 'Active' : 'Inactive'}
          </Badge>
        </XStack>
      </Card.Header>

      <Card.Body>
        <XStack gap="$2" flexWrap="wrap">
          <Badge backgroundColor="$primary" color="white">
            {rule.points} points
          </Badge>
          <Badge backgroundColor="$borderColor" color="$color">
            {rule.conditions.length} {rule.conditions.length === 1 ? 'condition' : 'conditions'}
          </Badge>
        </XStack>
      </Card.Body>
    </Card>
  );
}

export default function RulesScreen() {
  const router = useRouter();
  const { data: rules, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
    placeholderData: [],
  });

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$colorFocus">Loading rules...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack padding="$4" paddingBottom="$2">
        <H2 color="$color">Reward Rules</H2>
        <Text color="$colorFocus" fontSize="$3" marginTop="$1">
          Manage and create reward rules for your team
        </Text>
      </YStack>

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RuleCard rule={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
            <Text fontSize="$8" color="$colorFocus" marginBottom="$4">📋</Text>
            <Text fontSize="$6" color="$color" fontWeight="600" marginBottom="$2">
              No rules yet
            </Text>
            <Text color="$colorFocus" textAlign="center" marginBottom="$4">
              Create your first reward rule to get started
            </Text>
            <Button
              backgroundColor="$primary"
              color="white"
              onPress={() => router.push('/rules/create')}
            >
              Create Rule
            </Button>
          </YStack>
        }
      />
    </YStack>
  );
}
