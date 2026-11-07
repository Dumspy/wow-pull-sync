// @vitest-environment happy-dom

import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsList, TabsTrigger } from "./tabs";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let mounted: { root: Root; container: HTMLDivElement } | null = null;

afterEach(() => {
  mounted?.root.unmount();
  mounted?.container.remove();
  mounted = null;
});

describe("vertical orientation", () => {
  it("moves between vertical tabs with ArrowDown and ArrowUp", async () => {
    const container = await render(
      createElement(
        Tabs,
        { orientation: "vertical", defaultValue: "one" },
        createElement(
          TabsList,
          null,
          createElement(TabsTrigger, { value: "one" }, "One"),
          createElement(TabsTrigger, { value: "two" }, "Two"),
          createElement(TabsTrigger, { value: "three" }, "Three"),
        ),
      ),
    );

    const list = container.querySelector("[role='tablist']");
    const tabs = [...container.querySelectorAll<HTMLElement>("[role='tab']")];

    expect(list?.getAttribute("aria-orientation")).toBe("vertical");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["One", "Two", "Three"]);

    await focus(tabs[0]);
    await press("ArrowDown");
    expect(document.activeElement).toBe(tabs[1]);

    await press("ArrowDown");
    expect(document.activeElement).toBe(tabs[2]);

    await press("ArrowUp");
    expect(document.activeElement).toBe(tabs[1]);
  });

  it("moves between vertical toggle items with ArrowDown and ArrowUp", async () => {
    const container = await render(
      createElement(
        ToggleGroup,
        { orientation: "vertical" },
        createElement(ToggleGroupItem, { value: "one" }, "One"),
        createElement(ToggleGroupItem, { value: "two" }, "Two"),
        createElement(ToggleGroupItem, { value: "three" }, "Three"),
      ),
    );

    const items = [...container.querySelectorAll<HTMLElement>("button")];

    expect(items.map((item) => item.textContent)).toEqual(["One", "Two", "Three"]);

    await focus(items[0]);
    await press("ArrowDown");
    expect(document.activeElement).toBe(items[1]);

    await press("ArrowUp");
    expect(document.activeElement).toBe(items[0]);
  });
});

async function render(node: ReactNode): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(node);
  });

  mounted = { root, container };

  return container;
}

async function focus(item: HTMLElement | undefined) {
  if (!item) throw new Error("missing item");

  await act(async () => {
    item.focus();
  });
}

async function press(key: string) {
  const target = document.activeElement;

  if (!(target instanceof HTMLElement)) throw new Error("nothing focused");

  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}
