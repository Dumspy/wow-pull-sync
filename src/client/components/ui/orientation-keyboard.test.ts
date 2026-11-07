// @vitest-environment happy-dom

import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function mount(element: ReactElement): HTMLDivElement {
  const host = document.createElement("div");

  document.body.appendChild(host);
  const mounted = createRoot(host);

  container = host;
  root = mounted;
  act(() => {
    mounted.render(element);
  });

  return host;
}

function buttons(host: ParentNode, selector: string): HTMLButtonElement[] {
  const found: HTMLButtonElement[] = [];

  for (const node of host.querySelectorAll(selector)) {
    if (node instanceof HTMLButtonElement) {
      found.push(node);
    }
  }

  return found;
}

async function focus(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.focus();
  });
}

async function press(key: string): Promise<void> {
  const target = document.activeElement;

  if (!(target instanceof HTMLElement)) {
    throw new Error(`No element focused before ${key}`);
  }

  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe("Tabs orientation keyboard", () => {
  function tabs(orientation: "horizontal" | "vertical"): HTMLDivElement {
    return mount(
      createElement(
        Tabs,
        { orientation, defaultValue: "one" },
        createElement(
          TabsList,
          null,
          createElement(TabsTrigger, { value: "one" }, "One"),
          createElement(TabsTrigger, { value: "two" }, "Two"),
          createElement(TabsTrigger, { value: "three" }, "Three"),
        ),
      ),
    );
  }

  it("moves focus with vertical arrows and sets aria-orientation", async () => {
    const host = tabs("vertical");
    const triggers = buttons(host, '[role="tab"]');

    expect(host.querySelector('[role="tablist"]')?.getAttribute("aria-orientation")).toBe(
      "vertical",
    );

    await focus(triggers[0]);
    await press("ArrowDown");
    expect(document.activeElement).toBe(triggers[1]);

    await press("ArrowDown");
    expect(document.activeElement).toBe(triggers[2]);

    await press("ArrowUp");
    expect(document.activeElement).toBe(triggers[1]);

    await press("ArrowRight");
    expect(document.activeElement).toBe(triggers[1]);

    await press("ArrowLeft");
    expect(document.activeElement).toBe(triggers[1]);
  });

  it("keeps horizontal arrow movement and leaves aria-orientation unset", async () => {
    const host = tabs("horizontal");
    const triggers = buttons(host, '[role="tab"]');

    expect(host.querySelector('[role="tablist"]')?.getAttribute("aria-orientation")).toBeNull();

    await focus(triggers[0]);
    await press("ArrowRight");
    expect(document.activeElement).toBe(triggers[1]);

    await press("ArrowLeft");
    expect(document.activeElement).toBe(triggers[0]);

    await press("ArrowDown");
    expect(document.activeElement).toBe(triggers[0]);

    await press("ArrowUp");
    expect(document.activeElement).toBe(triggers[0]);
  });
});

describe("ToggleGroup orientation keyboard", () => {
  function group(orientation: "horizontal" | "vertical"): HTMLDivElement {
    return mount(
      createElement(
        ToggleGroup,
        { orientation },
        createElement(ToggleGroupItem, { value: "one" }, "One"),
        createElement(ToggleGroupItem, { value: "two" }, "Two"),
        createElement(ToggleGroupItem, { value: "three" }, "Three"),
      ),
    );
  }

  it("moves focus with vertical arrows and ignores horizontal arrows", async () => {
    const host = group("vertical");
    const items = buttons(host, "button");

    await focus(items[0]);
    await press("ArrowDown");
    expect(document.activeElement).toBe(items[1]);

    await press("ArrowDown");
    expect(document.activeElement).toBe(items[2]);

    await press("ArrowUp");
    expect(document.activeElement).toBe(items[1]);

    await press("ArrowRight");
    expect(document.activeElement).toBe(items[1]);

    await press("ArrowLeft");
    expect(document.activeElement).toBe(items[1]);
  });

  it("keeps horizontal arrow movement", async () => {
    const host = group("horizontal");
    const items = buttons(host, "button");

    await focus(items[0]);
    await press("ArrowRight");
    expect(document.activeElement).toBe(items[1]);

    await press("ArrowLeft");
    expect(document.activeElement).toBe(items[0]);

    await press("ArrowDown");
    expect(document.activeElement).toBe(items[0]);

    await press("ArrowUp");
    expect(document.activeElement).toBe(items[0]);
  });
});
