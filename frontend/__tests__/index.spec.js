import { render, screen } from "@testing-library/react";

// Picture wraps next/image; substitute a plain <img> so the test does not
// need the Next.js image optimisation pipeline.
jest.mock("../components/picture", () =>
  function Picture({ imgAlt }) {
    return <img alt={imgAlt} />;
  }
);

// SEO writes only into <head>; nothing visible to queries in jsdom.
jest.mock("../components/seo", () => function SEO() { return null; });

import Home from "../pages/index";

describe("Home page", () => {
  it("renders the Explorer navigation link", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /explorer/i })).toBeInTheDocument();
  });

  it("renders the Curator navigation link", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /curator/i })).toBeInTheDocument();
  });

  it("renders two banner images", () => {
    render(<Home />);
    // One blurred background, one foreground poster.
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });

  it("describes the application purpose", () => {
    render(<Home />);
    expect(
      screen.getByText(/facilitates the organization, annotation and exploration/i)
    ).toBeInTheDocument();
  });
});
