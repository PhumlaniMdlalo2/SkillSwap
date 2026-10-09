import { render, fireEvent } from '@testing-library/react-native';
import BountyCard from '../../src/components/bounties/BountyCard';

jest.mock('../../src/utils/alert', () => ({
  notify: jest.fn(),
  confirmAction: jest.fn(),
}));

function makeSwapBounty(overrides = {}) {
  return {
    id: 'b1',
    creatorId: 'u1',
    title: 'Swap Spanish lessons for Python',
    description: 'Help me practice Spanish and I will teach you Python in return',
    category: 'Languages',
    rewardType: 'swap',
    tokenAmount: 1,
    urgency: 'flexible',
    status: 'open',
    createdAt: '2026-10-07T12:00:00Z',
    creator: { user_id: 'u1', name: 'John', avatar: null, rating: 5 },
    offers: [
      {
        id: 'o1',
        bountyId: 'b1',
        helperId: 'u2',
        message: 'Fluent in Spanish, happy to swap!',
        status: 'pending',
        createdAt: '2026-10-07T13:00:00Z',
        helper: { user_id: 'u2', name: 'Sarah', avatar: null },
      },
    ],
    trade: null,
    ...overrides,
  };
}

describe('BountyCard — skill-trade proof', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lets the creator accept a pending swap offer', async () => {
    const onAcceptOffer = jest.fn();
    const { getByText, getByLabelText } = await render(
      <BountyCard
        bounty={makeSwapBounty()}
        currentUserId="u1"
        onAcceptOffer={onAcceptOffer}
        onConfirmTrade={jest.fn()}
      />,
    );

    expect(getByText('Sarah')).toBeTruthy();
    expect(getByText('Offers — pick the swap')).toBeTruthy();

    fireEvent.press(getByLabelText('Accept'));

    expect(onAcceptOffer).toHaveBeenCalledWith('b1', 'o1');
  });

  it("hides Mark Completed for swap bounties so completion goes through the trade", async () => {
    const { queryByText } = await render(
      <BountyCard
        bounty={makeSwapBounty()}
        currentUserId="u1"
        onAcceptOffer={jest.fn()}
        onConfirmTrade={jest.fn()}
      />,
    );

    expect(queryByText('Mark Completed')).toBeNull();
  });

  it('lets a trade participant confirm they did their side', async () => {
    const onConfirmTrade = jest.fn();
    const { getByLabelText, getByText } = await render(
      <BountyCard
        bounty={makeSwapBounty({
          status: 'in_progress',
          offers: [],
          trade: {
            id: 't1',
            bountyId: 'b1',
            creatorId: 'u1',
            helperId: 'u2',
            status: 'in_progress',
            creatorConfirmedAt: null,
            helperConfirmedAt: null,
            createdAt: '2026-10-08T09:00:00Z',
          },
        })}
        currentUserId="u2"
        onAcceptOffer={jest.fn()}
        onConfirmTrade={onConfirmTrade}
      />,
    );

    expect(getByText('💞 Skill trade in progress')).toBeTruthy();
    fireEvent.press(getByLabelText('I did my side 🤝'));

    expect(onConfirmTrade).toHaveBeenCalledWith('t1');
  });

  it('shows a completed badge once both sides confirmed the trade', async () => {
    const { getByText } = await render(
      <BountyCard
        bounty={makeSwapBounty({
          status: 'completed',
          offers: [],
          trade: {
            id: 't1',
            bountyId: 'b1',
            creatorId: 'u1',
            helperId: 'u2',
            status: 'completed',
            creatorConfirmedAt: '2026-10-08T10:00:00Z',
            helperConfirmedAt: '2026-10-08T10:05:00Z',
            createdAt: '2026-10-08T09:00:00Z',
          },
        })}
        currentUserId="u2"
        onAcceptOffer={jest.fn()}
        onConfirmTrade={jest.fn()}
      />,
    );

    expect(getByText('✅ Skill trade confirmed by both sides')).toBeTruthy();
  });
});