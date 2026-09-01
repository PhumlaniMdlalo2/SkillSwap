import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../src/components/ui/Button';

describe('Button', () => {
  it('renders the title', async () => {
    const { getByText } = await render(<Button title="Save" onPress={jest.fn()} />);
    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Go" onPress={onPress} />);
    await fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Go" onPress={onPress} disabled />);
    await fireEvent.press(getByText('Go'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and disables the button while loading', async () => {
    const { queryByText, toJSON } = await render(
      <Button title="Go" onPress={jest.fn()} loading />
    );
    expect(queryByText('Go')).toBeNull();
    expect(JSON.stringify(toJSON())).toContain('ActivityIndicator');
    expect(JSON.stringify(toJSON())).toContain('"disabled":true');
  });

  it('falls back to primary variant for unknown variants', async () => {
    const { getByText } = await render(
      <Button title="X" onPress={jest.fn()} variant="bogus" />
    );
    expect(getByText('X')).toBeTruthy();
  });
});