import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import Badge from '../../src/components/ui/Badge';
import Avatar from '../../src/components/ui/Avatar';
import Card from '../../src/components/ui/Card';
import TokenBalance from '../../src/components/wallet/TokenBalance';

describe('Badge', () => {
  it('renders the label', async () => {
    const { getByText } = await render(<Badge label="Pending" />);
    expect(getByText('Pending')).toBeTruthy();
  });

  it('falls back to neutral tone for unknown tones', async () => {
    const { getByText } = await render(<Badge label="X" tone="bogus" />);
    expect(getByText('X')).toBeTruthy();
  });

  it('renders for all defined tones without crashing', async () => {
    for (const tone of ['neutral', 'success', 'warning', 'danger']) {
      const { getByText } = await render(<Badge label={tone} tone={tone} />);
      expect(getByText(tone)).toBeTruthy();
    }
  });
});

describe('Avatar', () => {
  it('renders image initials when no uri is provided', async () => {
    const { getByText } = await render(<Avatar name="Ada Lovelace" />);
    expect(getByText('AL')).toBeTruthy();
  });

  it('skips the initials fallback when a uri is provided', async () => {
    const { queryByText } = await render(
      <Avatar uri="https://example.com/pic.png" name="Ada Lovelace" />
    );
    expect(queryByText('AL')).toBeNull();
  });

  it('renders initials for a single-word name', async () => {
    const { getByText } = await render(<Avatar name="Beyonce" />);
    expect(getByText('B')).toBeTruthy();
  });

  it('renders no initials when name is missing', async () => {
    const { queryByText } = await render(<Avatar name="" />);
    expect(queryByText(/[A-Z]/)).toBeNull();
  });
});

describe('Card', () => {
  it('renders children', async () => {
    const { getByText } = await render(<Card><Text>Hello</Text></Card>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('is pressable when onPress is provided', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Card onPress={onPress}><Text>Click me</Text></Card>);
    await fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not crash without onPress', async () => {
    const { getByText } = await render(<Card><Text>Static</Text></Card>);
    expect(getByText('Static')).toBeTruthy();
  });
});

describe('TokenBalance', () => {
  it('renders the balance value', async () => {
    const { getByText } = await render(<TokenBalance balance={12} />);
    expect(getByText('12')).toBeTruthy();
  });

  it('uses singular "time token" for balance 1', async () => {
    const { getByText } = await render(<TokenBalance balance={1} />);
    expect(getByText('time token')).toBeTruthy();
  });

  it('uses plural "time tokens" otherwise', async () => {
    const { getByText } = await render(<TokenBalance balance={5} />);
    expect(getByText('time tokens')).toBeTruthy();
  });
});