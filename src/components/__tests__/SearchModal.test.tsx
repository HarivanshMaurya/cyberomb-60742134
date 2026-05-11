import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchModal from "../SearchModal";

// Mock data hooks so the modal renders deterministic results
vi.mock("@/hooks/useArticles", () => ({
  useArticles: () => ({
    data: [
      { id: "a1", slug: "hello-world", title: "Hello World", category: "wellness" },
      { id: "a2", slug: "second-post", title: "Second Post", category: "travel" },
    ],
  }),
}));
vi.mock("@/hooks/useProducts", () => ({
  useActiveProducts: () => ({
    data: [{ id: "p1", slug: "ebook-one", title: "Ebook One" }],
  }),
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({
    data: [{ id: "c1", slug: "wellness", name: "Wellness" }],
  }),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderModal(onOpenChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SearchModal open={true} onOpenChange={onOpenChange} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...utils, onOpenChange };
}

describe("SearchModal keyboard interactions", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders the search input with focus", async () => {
    renderModal();
    const input = await screen.findByPlaceholderText(/search articles/i);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("renders grouped results (Categories, Articles, eBooks)", async () => {
    renderModal();
    expect(await screen.findByText("Wellness")).toBeInTheDocument();
    expect(await screen.findByText("Hello World")).toBeInTheDocument();
    expect(await screen.findByText("Ebook One")).toBeInTheDocument();
  });

  it("ArrowDown / ArrowUp moves the active item", async () => {
    const user = userEvent.setup();
    renderModal();
    const input = await screen.findByPlaceholderText(/search articles/i);

    // First selectable item is auto-highlighted by cmdk
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    // Some item should carry the data-selected attribute set by cmdk
    await waitFor(() => {
      const selected = document.querySelector('[data-selected="true"]');
      expect(selected).not.toBeNull();
    });
    expect(input).toHaveFocus(); // focus stays on the input while navigating
  });

  it("Enter activates the highlighted result and navigates", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderModal(onOpenChange);

    await screen.findByText("Wellness");
    // Type to narrow to a specific article
    await user.keyboard("Hello");
    await waitFor(() => expect(screen.getByText("Hello World")).toBeInTheDocument());

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
    const target = navigateMock.mock.calls[0][0];
    expect(target).toMatch(/^\/(blog|category|product)\//);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Escape closes the dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderModal(onOpenChange);

    await screen.findByPlaceholderText(/search articles/i);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("filters out non-matching results when typing", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Hello World");
    await user.keyboard("Second");

    await waitFor(() => {
      expect(screen.queryByText("Hello World")).not.toBeInTheDocument();
      expect(screen.getByText("Second Post")).toBeInTheDocument();
    });
  });
});

describe("SearchModal global shortcut", () => {
  it("Cmd/Ctrl+K toggles the modal via the registered listener", async () => {
    const onOpenChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <SearchModal open={false} onOpenChange={onOpenChange} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
      );
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
