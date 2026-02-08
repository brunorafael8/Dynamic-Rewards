import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { YStack, XStack, Card, H2, H4, Text, Button, Spinner } from 'tamagui';
import { processVisits, ProcessResult, queryClient } from '../../lib/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

function ResultCard({ result }: { result: ProcessResult }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Card elevate size="$4" bordered backgroundColor="$backgroundStrong" marginTop="$6">
        <Card.Header>
          <H4 color="$color">Processing Complete</H4>
        </Card.Header>
        <Card.Body gap="$3">
          <XStack justifyContent="space-between">
            <Text color="$colorFocus">Total Visits</Text>
            <Text fontWeight="600" color="$color">{result.totalVisits}</Text>
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
}

export default function ProcessScreen() {
  const [lastResult, setLastResult] = useState<ProcessResult | null>(null);
  const mutation = useMutation({
    mutationFn: processVisits,
    onSuccess: (data) => {
      setLastResult(data);
      // Invalidate profiles query to refresh balances
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  return (
    <YStack flex={1} backgroundColor="$background" padding="$4">
      <YStack marginTop="$4">
        <H2 color="$color">Process Visits</H2>
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
          onPress={() => { setLastResult(null); mutation.mutate(); }}
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
            <Text color="white" fontWeight="600">Process All Visits</Text>
          )}
        </Button>
      </YStack>

      {lastResult && <ResultCard result={lastResult} />}
    </YStack>
  );
}
