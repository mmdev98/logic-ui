import { describe, expect, it } from "vitest";
import { LightboxMediaStatus } from "../types";
import {
  fillLightboxMediaBox,
  findLightboxMediaElement,
  getLightboxMediaNaturalSize,
  getLightboxMediaStatus,
  isLightboxMediaPlayable,
  isLightboxMediaZoomable,
} from "./lightbox-media";

function box(html: string): HTMLElement {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element;
}

describe("findLightboxMediaElement", () => {
  it.each([
    ["an image", "<span></span><img alt='' />", "IMG"],
    ["a video", "<video></video><p></p>", "VIDEO"],
    ["an iframe", "<iframe title='x'></iframe>", "IFRAME"],
    ["the image of a picture", "<picture><img alt='' /></picture>", "IMG"],
  ])("finds %s among the direct children", (_, html, tagName) => {
    expect(findLightboxMediaElement(box(html))?.tagName).toBe(tagName);
  });

  it("ignores media nested in other children", () => {
    expect(
      findLightboxMediaElement(box("<p><img alt='' /> Can't load</p>")),
    ).toBeNull();
  });
});

describe("fillLightboxMediaBox", () => {
  it("makes an image fill the box, not draggable, and restores it", () => {
    const image = document.createElement("img");
    image.style.width = "50px";

    const restore = fillLightboxMediaBox(image);

    expect(image.style.width).toBe("100%");
    expect(image.style.objectFit).toBe("contain");
    expect(image.getAttribute("draggable")).toBe("false");

    restore();

    expect(image.style.width).toBe("50px");
    expect(image.hasAttribute("draggable")).toBe(false);
  });

  it("leaves a video's draggable alone", () => {
    const video = document.createElement("video");
    fillLightboxMediaBox(video);
    expect(video.hasAttribute("draggable")).toBe(false);
  });
});

describe("isLightboxMediaZoomable", () => {
  it.each([
    ["IMG", true],
    ["VIDEO", false],
    ["IFRAME", false],
  ])("is %s zoomable: %s", (tagName, expected) => {
    expect(isLightboxMediaZoomable(document.createElement(tagName))).toBe(
      expected,
    );
  });

  it("is false without a media element", () => {
    expect(isLightboxMediaZoomable(null)).toBe(false);
  });
});

describe("isLightboxMediaPlayable", () => {
  it.each([
    ["VIDEO", true],
    ["IMG", false],
    ["IFRAME", false],
  ])("is %s playable: %s", (tagName, expected) => {
    expect(isLightboxMediaPlayable(document.createElement(tagName))).toBe(
      expected,
    );
  });
});

describe("getLightboxMediaNaturalSize", () => {
  it("reads an image's natural size", () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "naturalWidth", { value: 800 });
    Object.defineProperty(image, "naturalHeight", { value: 600 });
    expect(getLightboxMediaNaturalSize(image)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("reads a video's size", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { value: 1920 });
    Object.defineProperty(video, "videoHeight", { value: 1080 });
    expect(getLightboxMediaNaturalSize(video)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it("is null until the size is known", () => {
    expect(
      getLightboxMediaNaturalSize(document.createElement("img")),
    ).toBeNull();
  });
});

describe("getLightboxMediaStatus", () => {
  it("counts no media element as loaded", () => {
    expect(getLightboxMediaStatus(null)).toBe(LightboxMediaStatus.Loaded);
  });

  it("counts a complete image with a size as loaded", () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 800 });
    expect(getLightboxMediaStatus(image)).toBe(LightboxMediaStatus.Loaded);
  });

  it("counts an image without a size as loading", () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    expect(getLightboxMediaStatus(image)).toBe(LightboxMediaStatus.Loading);
  });

  it.each([
    [0, LightboxMediaStatus.Loading],
    [2, LightboxMediaStatus.Loaded],
  ])("counts a video with readyState %s as %s", (readyState, expected) => {
    const video = document.createElement("video");
    Object.defineProperty(video, "readyState", { value: readyState });
    expect(getLightboxMediaStatus(video)).toBe(expected);
  });

  it("counts an iframe as loading until its load event", () => {
    expect(getLightboxMediaStatus(document.createElement("iframe"))).toBe(
      LightboxMediaStatus.Loading,
    );
  });
});
