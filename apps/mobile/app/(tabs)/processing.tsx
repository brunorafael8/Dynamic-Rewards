import { useState, useCallback, memo } from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { YStack, XStack, Card, H2, H4, Text, Button, Spinner } from 'tamagui';
import { processEvents, ProcessResult, queryClient } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import Animated, { FadeInDown } from 'react-native-reanimated';

const ResultCard = memo(({ result }: { result: ProcessResult }) => {
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Card elevate size="$4" bordered backgroundColor="$backgroundStrong" marginTop="$6">
        <Card.Header>
          <H4 color="$color">Processing Complete</H4>
        </Card.Header>
        <Card.Body gap="$3">
          <XStack justifyContent="space-between">
            <Text color="$colorFocus">Total Events</Text>
            <Text fontWeight="600" color="$color">{result.totalEvents}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text color="$colorFocus">Grants Created</Text>
            <Text fontWeight="600" color="$primary">{result.grantsCreated}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text color="$colorFocus">Points Awarded</Text>
            <Text fontWeight="600" color="$primary" fontSize="$6">{result.totalPointsAwarded}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text color="$colorFocus">Duration</Text>
            <Text fontWeight="600" color="$color">{result.durationMs}ms</Text>
          </XStack>
        </Card.Body>
      </Card>
    </Animated.View>
  );
});

ResultCard.displayName = 'ResultCard';

export default function ProcessScreen() {
  const [lastResult, setLastResult] = useState<ProcessResult | null>(null);

  const mutation = useMutation({
    mutationFn: processEvents,
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.all });
    },
    onError: (error: Error) => {
      Alert.alert(
        'Processing Failed',
        error.message || 'Could not connect to the server. Check your connection and try again.',
        [{ text: 'OK' }],
      );
    },
  });

  const handleProcess = useCallback(() => {
    setLastResult(null);
    mutation.mutate();
  }, [mutation]);

  return (
    <YStack flex={1} backgroundColor="$background" padding="$4">
      <YStack marginTop="$4">
        <H2 color="$color">Process Events</H2>
        <Text color="$colorFocus" fontSize="$3" marginTop="$1">
          Evaluate all visits against active rules
        </Text>
      </YStack>

      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text fontSize="$8" marginBottom="$4">⚡</Text>
        <Button
          size="$6"
          backgroundColor="$primary"
          color="white"
          pressStyle={{ scale: 0.95 }}
          onPress={handleProcess}
          disabled={mutation.isPending}
          width="80%"
          maxWidth={300}
        >
          {mutation.isPending ? (
            <XStack gap="$2" alignItems="center">
              <Spinner color="white" size="small" />
              <Text color="white">Processing...</Text>
            </XStack>
          ) : (
            <Text color="white" fontWeight="600">Process All Events</Text>
          )}
        </Button>
      </YStack>

      {mutation.isError ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card elevate size="$4" bordered backgroundColor="$backgroundStrong" marginTop="$6">
            <Card.Header>
              <H4 color="$red10">Processing Failed</H4>
            </Card.Header>
            <Card.Body>
              <Text color="$colorFocus">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'An unexpected error occurred. Please try again.'}
              </Text>
              <Button
                marginTop="$3"
                backgroundColor="$primary"
                color="white"
                onPress={handleProcess}
              >
                Retry
              </Button>
            </Card.Body>
          </Card>
        </Animated.View>
      ) : null}

      {lastResult ? <ResultCard result={lastResult} /> : null}
    </YStack>
  );
}
