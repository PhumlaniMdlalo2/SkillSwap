import { render, fireEvent } from '@testing-library/react-native';
import SessionCard from '../../src/components/sessions/SessionCard';
import SkillCard from '../../src/components/skills/SkillCard';

const session = {
  id: 's1',
  status: 'pending',
  skill_title: 'Beginner Guitar',
  session_date: '2024-05-15T14:30:00Z',
};

describe('SessionCard', () => {
  it('renders the skill title', async () => {
    const { getByText } = await render(<SessionCard session={session} role="learner" />);
    expect(getByText('Beginner Guitar')).toBeTruthy();
  });

  it('maps pending status to the "Upcoming" label', async () => {
    const { getByText } = await render(<SessionCard session={session} role="learner" />);
    expect(getByText('Upcoming')).toBeTruthy();
  });

  it('shows Teaching for a teacher role', async () => {
    const { getByText } = await render(<SessionCard session={session} role="teacher" />);
    expect(getByText('Teaching')).toBeTruthy();
  });

  it('shows Learning for a learner/other role', async () => {
    const { getByText } = await render(<SessionCard session={session} role="learner" />);
    expect(getByText('Learning')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<SessionCard session={session} role="learner" onPress={onPress} />);
    await fireEvent.press(getByText('Beginner Guitar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a fallback label for unknown statuses', async () => {
    const { getByText } = await render(
      <SessionCard session={{ ...session, status: 'weird' }} role="learner" />
    );
    expect(getByText('weird')).toBeTruthy();
  });
});

describe('SkillCard', () => {
  const skill = {
    id: 'sk1',
    title: 'Watercolor Basics',
    description: 'Learn to paint with watercolors.',
    category: 'Art & Design',
    teacher: { name: 'Frida Kahlo', rating: 4.8, avatar: null },
  };

  it('renders skill title, description, and category', async () => {
    const { getByText } = await render(<SkillCard skill={skill} />);
    expect(getByText('Watercolor Basics')).toBeTruthy();
    expect(getByText('Learn to paint with watercolors.')).toBeTruthy();
    expect(getByText('Art & Design')).toBeTruthy();
  });

  it('renders the teacher name and rating', async () => {
    const { getByText } = await render(<SkillCard skill={skill} />);
    expect(getByText('Frida Kahlo')).toBeTruthy();
    expect(getByText('4.8')).toBeTruthy();
  });

  it('falls back to the default teacher name when missing', async () => {
    const { getByText } = await render(<SkillCard skill={{ ...skill, teacher: null }} />);
    expect(getByText('SkillSwap teacher')).toBeTruthy();
  });

  it('falls back to an em dash for a missing rating', async () => {
    const { getByText } = await render(
      <SkillCard skill={{ ...skill, teacher: { name: 'Frida Kahlo', rating: null } }} />
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<SkillCard skill={skill} onPress={onPress} />);
    await fireEvent.press(getByText('Watercolor Basics'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});