import { memo, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollView, RefreshControl, Alert } from 'react-native';
import { YStack, XStack, Card, H2, H4, Text, Badge, Spinner, Button, Separator } from 'tamagui';
import { fetchLLMAnalytics, clearLLMAnalytics, type LLMAnalyticsSummary } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

const StatCard = memo(({
  label,
  value,
  icon,
  color = '$primary'
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) => (
  <Card
    elevate
    size="$4"
    bordered
    backgroundColor="$backgroundStrong"
    flex={1}
    minWidth={150}
  >
    <Card.Header paddingBottom="$2">
      <Text fontSize="$8" marginBottom="$2">{icon}</Text>
      <Text fontSize="$2" color="$colorFocus" textTransform="uppercase" fontWeight="600">
        {label}
      </Text>
    </Card.Header>
    <Card.Body paddingTop="$2">
      <Text fontSize="$7" fontWeight="700" color={color}>
        {value}
      </Text>
    </Card.Body>
  </Card>
));

StatCard.displayName = 'StatCard';

const ModelUsageRow = memo(({
  model,
  count,
  total
}: {
  model: string;
  count: number;
  total: number;
}) => {
  const percentage = ((count / total) * 100).toFixed(0);
  const displayName = model.includes('haiku') ? 'Haiku' :
                      model.includes('sonnet') ? 'Sonnet' :
                      model.includes('opus') ? 'Opus' :
                      model.includes('gpt-4o-mini') ? 'GPT-4o Mini' :
                      model.includes('gpt-4o') ? 'GPT-4o' :
                      model.includes('o1') ? 'o1-preview' : model;

  return (
    <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
      <Text fontSize="$4" color="$color" flex={1}>{displayName}</Text>
      <XStack gap="$2" alignItems="center">
        <Text fontSize="$4" color="$colorFocus">{count}</Text>
        <Badge backgroundColor="$borderColor" color="$color" minWidth={50}>
          {percentage}%
        </Badge>
      </XStack>
    </XStack>
  );
});

ModelUsageRow.displayName = 'ModelUsageRow';

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.llm.analytics,
    queryFn: fetchLLMAnalytics,
  });

  const clearMutation = useMutation({
    mutationFn: clearLLMAnalytics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.llm.analytics });
      Alert.alert('Success', 'Analytics and cache cleared successfully');
      setIsClearing(false);
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to clear: ${error.message}`);
      setIsClearing(false);
    },
  });

  const handleClearPress = useCallback(() => {
    Alert.alert(
      'Clear Analytics & Cache',
      'This will permanently delete all LLM analytics data and cached results. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setIsClearing(true);
            clearMutation.mutate();
          },
        },
      ]
    );
  }, [clearMutation]);

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$colorFocus">Loading analytics...</Text>
      </YStack>
    );
  }

  const summary = data?.summary;
  const complexity = data?.complexity;
  const models = data?.models;
  const cache = data?.cache;

  const hasData = summary && summary.totalCalls > 0;

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack paddingBottom="$2" marginBottom="$4">
          <H2 color="$color">LLM Analytics</H2>
          <Text color="$colorFocus" fontSize="$3" marginTop="$1">
            Monitor AI usage, costs, and performance
          </Text>
        </YStack>

        {!hasData ? (
          <YStack
            backgroundColor="$backgroundStrong"
            padding="$6"
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize="$8" marginBottom="$3">🤖</Text>
            <Text fontSize="$6" fontWeight="600" color="$color" marginBottom="$2">
              No analytics yet
            </Text>
            <Text color="$colorFocus" textAlign="center">
              Process some events with LLM rules to see analytics
            </Text>
          </YStack>
        ) : (
          <YStack gap="$4">
            {/* Overview Stats */}
            <YStack gap="$3">
              <H4 color="$color">Overview</H4>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard
                  label="Total Calls"
                  value={summary.totalCalls.toString()}
                  icon="📞"
                  color="$primary"
                />
                <StatCard
                  label="Cache Hit Rate"
                  value={summary.cacheHitRate}
                  icon="⚡"
                  color="#10B981"
                />
              </XStack>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard
                  label="Total Cost"
                  value={summary.totalCost}
                  icon="💰"
                  color="$primary"
                />
                <StatCard
                  label="Cost Savings"
                  value={summary.costSavings}
                  icon="💎"
                  color="#10B981"
                />
              </XStack>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard
                  label="Avg Latency"
                  value={summary.avgLatency}
                  icon="⏱️"
                  color="$colorFocus"
                />
                <StatCard
                  label="Savings"
                  value={summary.savingsMultiplier}
                  icon="📈"
                  color="#6C5CE7"
                />
              </XStack>
            </YStack>

            {/* Complexity Distribution */}
            {complexity && (
              <Card elevate size="$4" bordered backgroundColor="$backgroundStrong">
                <Card.Header>
                  <H4 color="$color">Complexity Distribution</H4>
                  <Text fontSize="$3" color="$colorFocus" marginTop="$1">
                    How requests are routed to models
                  </Text>
                </Card.Header>
                <Card.Body paddingTop="$3">
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" color="$color">Simple</Text>
                      <Badge backgroundColor="#10B981" color="white">
                        {complexity.simple}
                      </Badge>
                    </XStack>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" color="$color">Complex</Text>
                      <Badge backgroundColor="#F59E0B" color="white">
                        {complexity.complex}
                      </Badge>
                    </XStack>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" color="$color">Ultra-Complex</Text>
                      <Badge backgroundColor="#EF4444" color="white">
                        {complexity.ultraComplex}
                      </Badge>
                    </XStack>
                  </YStack>
                </Card.Body>
              </Card>
            )}

            {/* Model Usage */}
            {models && Object.keys(models).length > 0 && (
              <Card elevate size="$4" bordered backgroundColor="$backgroundStrong">
                <Card.Header>
                  <H4 color="$color">Model Usage</H4>
                  <Text fontSize="$3" color="$colorFocus" marginTop="$1">
                    Distribution across AI models
                  </Text>
                </Card.Header>
                <Card.Body paddingTop="$3">
                  <YStack>
                    {Object.entries(models).map(([model, count], index, arr) => (
                      <YStack key={model}>
                        <ModelUsageRow
                          model={model}
                          count={count as number}
                          total={summary.totalCalls}
                        />
                        {index < arr.length - 1 && <Separator marginVertical="$2" />}
                      </YStack>
                    ))}
                  </YStack>
                </Card.Body>
              </Card>
            )}

            {/* Cache Stats */}
            {cache && (
              <Card elevate size="$4" bordered backgroundColor="$backgroundStrong">
                <Card.Header>
                  <H4 color="$color">Cache Performance</H4>
                  <Text fontSize="$3" color="$colorFocus" marginTop="$1">
                    Semantic caching efficiency
                  </Text>
                </Card.Header>
                <Card.Body paddingTop="$3">
                  <YStack gap="$3">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" color="$color">Entries</Text>
                      <Text fontSize="$5" fontWeight="600" color="$primary">
                        {cache.entries}
                      </Text>
                    </XStack>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" color="$color">Total Hits</Text>
                      <Text fontSize="$5" fontWeight="600" color="#10B981">
                        {cache.totalHits}
                      </Text>
                    </XStack>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" color="$color">Avg Hits/Entry</Text>
                      <Text fontSize="$5" fontWeight="600" color="$colorFocus">
                        {cache.avgHitsPerEntry}
                      </Text>
                    </XStack>
                  </YStack>
                </Card.Body>
              </Card>
            )}

            {/* Clear Button */}
            <Button
              backgroundColor="#EF4444"
              color="white"
              size="$5"
              marginTop="$2"
              onPress={handleClearPress}
              disabled={isClearing || clearMutation.isPending}
              opacity={isClearing || clearMutation.isPending ? 0.5 : 1}
            >
              {isClearing || clearMutation.isPending ? 'Clearing...' : '🗑️  Clear Analytics & Cache'}
            </Button>

            <Text
              fontSize="$2"
              color="$colorFocus"
              textAlign="center"
              marginTop="$2"
              marginBottom="$4"
            >
              This will permanently delete all data
            </Text>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
