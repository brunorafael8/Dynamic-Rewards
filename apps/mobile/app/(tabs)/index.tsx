import { memo, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Card, H2, Text, Badge, Spinner, Button } from 'tamagui';
import { fetchRules, RewardRule } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { useRouter } from 'expo-router';

const RuleCard = memo(({ rule }: { rule: RewardRule }) => {
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
            {rule.description ? (
              <Text fontSize="$3" color="$colorFocus" marginTop="$1">
                {rule.description}
              </Text>
            ) : null}
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
});

RuleCard.displayName = 'RuleCard';

const keyExtractor = (item: RewardRule) => item.id;
const renderItem = ({ item }: { item: RewardRule }) => <RuleCard rule={item} />;
const contentContainerStyle = { padding: 16 };

export default function RulesScreen() {
  const router = useRouter();
  const { data: rules, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.rules.all,
    queryFn: fetchRules,
    placeholderData: [],
  });

  const handleCreateRule = useCallback(() => {
    router.push('/rules/create');
  }, [router]);

  const ListEmptyComponent = useMemo(
    () => (
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
          onPress={handleCreateRule}
        >
          Create Rule
        </Button>
      </YStack>
    ),
    [handleCreateRule]
  );

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$colorFocus">Loading rules...</Text>
      </YStack>
    );
  }

  if (isError) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center" padding="$4">
        <Text fontSize="$8" marginBottom="$4">⚠️</Text>
        <Text fontSize="$6" color="$color" fontWeight="600" marginBottom="$2" textAlign="center">
          Failed to load rules
        </Text>
        <Text color="$colorFocus" textAlign="center" marginBottom="$4">
          {error instanceof Error ? error.message : 'Could not connect to the server. Check your connection and try again.'}
        </Text>
        <Button
          backgroundColor="$primary"
          color="white"
          onPress={() => refetch()}
        >
          Retry
        </Button>
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
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={contentContainerStyle}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={ListEmptyComponent}
      />
    </YStack>
  );
}
