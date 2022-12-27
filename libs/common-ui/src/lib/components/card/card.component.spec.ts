import { CardComponent } from './card.component';
import { render, screen } from '@testing-library/angular';

describe('CardComponent', () => {
  test('should render card', async () => {
    const text = `<h1>This text should be projected</h1>`;
    await render(`<lib-card>${text}</lib-card>`, { declarations: [CardComponent] });

    const textHeading = screen.getByRole('heading');

    expect(textHeading).toBeInTheDocument();
  });
});
