import { Tooltip } from "react-tooltip";
import styled, { keyframes } from "styled-components";
import { getFontSize } from "../util";
import { isJetBrains } from "../util/ide";

export const VSC_SECONDARY_DARK_VAR = "--vscode-input-background";
export const VSC_BACKGROUND_VAR = "--vscode-sideBar-background";
export const VSC_FOREGROUND_VAR = "--vscode-editor-foreground";
export const VSC_BUTTON_BACKGROUND_VAR = "--vscode-button-background";
export const VSC_EDITOR_BACKGROUND_VAR = "--vscode-editor-background";

export const VSC_THEME_COLOR_VARS = [
  VSC_SECONDARY_DARK_VAR,
  VSC_BACKGROUND_VAR,
  VSC_FOREGROUND_VAR,
  VSC_BUTTON_BACKGROUND_VAR,
  VSC_EDITOR_BACKGROUND_VAR,
];

export const defaultBorderRadius = "5px";
export const lightGray = "#646464";
export const buttonColor = "#1bbe84";
export const buttonColorHover = "#1bbe84a8";

export const secondaryDark = `var(${VSC_SECONDARY_DARK_VAR}, rgb(45 45 45))`;
// export const vscBackground = "var(--vscode-editor-background, rgb(30 30 30))";
export const vscBackground = `var(${VSC_BACKGROUND_VAR}, rgb(30 30 30))`;
export const vscForeground = `var(${VSC_FOREGROUND_VAR}, #fff)`;
export const vscButtonBackground = `var(${VSC_BUTTON_BACKGROUND_VAR}, #1bbe84)`;
export const vscEditorBackground = `var(${VSC_EDITOR_BACKGROUND_VAR}, ${VSC_BACKGROUND_VAR}, rgb(30 30 30))`;

if (typeof document !== "undefined") {
  for (const colorVar of VSC_THEME_COLOR_VARS) {
    if (isJetBrains()) {
      const cached = localStorage.getItem(colorVar);
      if (cached) {
        document.body.style.setProperty(colorVar, cached);
      }
    }

    // Remove alpha channel from colors
    const value = getComputedStyle(document.documentElement).getPropertyValue(
      colorVar
    );
    if (colorVar.startsWith("#") && value.length > 7) {
      document.body.style.setProperty(colorVar, value.slice(0, 7));
    }
  }
}

export const Button = styled.button`
  padding: 10px 12px;
  margin: 8px 0;
  border-radius: ${defaultBorderRadius};

  border: none;
  color: white;
  background-color: ${buttonColor};

  &:disabled {
    color: gray;
  }

  &:hover:enabled {
    cursor: pointer;
  }
`;

export const StyledTooltip = styled(Tooltip)`
  font-size: 12px;
  background-color: rgb(60 60 60);
  border-radius: ${defaultBorderRadius};
  padding: 6px;
  padding-left: 12px;
  padding-right: 12px;
  z-index: 1000;

  max-width: 80vw;
`;

export const TextArea = styled.textarea`
  padding: 8px;
  font-family: inherit;
  border-radius: ${defaultBorderRadius};
  margin: 16px auto;
  height: auto;
  width: calc(100% - 32px);
  background-color: ${secondaryDark};
  color: ${vscForeground};
  z-index: 1;
  border: 1px solid transparent;

  resize: vertical;

  &:focus {
    outline: 1px solid ${lightGray};
    border: 1px solid transparent;
  }

  &::placeholder {
    color: ${lightGray}80;
  }
`;

export const Pre = styled.pre`
  border-radius: ${defaultBorderRadius};
  padding: 8px;
  max-height: 150px;
  overflow-y: scroll;
  margin: 0;
  background-color: ${vscBackground};
  border: none;

  /* text wrapping */
  white-space: pre-wrap; /* Since CSS 2.1 */
  white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
  white-space: -pre-wrap; /* Opera 4-6 */
  white-space: -o-pre-wrap; /* Opera 7 */
  word-wrap: break-word; /* Internet Explorer 5.5+ */
`;

export const H3 = styled.h3`
  background-color: ${secondaryDark};
  border-radius: ${defaultBorderRadius};
  padding: 4px 8px;
  width: fit-content;
`;

export const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  margin: 8px 0;
  box-sizing: border-box;
  border-radius: ${defaultBorderRadius};
  outline: 1px solid ${lightGray};
  border: none;
  background-color: ${vscBackground};
  color: ${vscForeground};

  &:focus {
    background: ${secondaryDark};
  }

  &:invalid {
    outline: 1px solid red;
  }
`;

export const NumberInput = styled.input.attrs({ type: "number" })`
  padding: 8px 12px;
  margin: 8px 4px;
  box-sizing: border-box;
  border-radius: ${defaultBorderRadius};
  outline: 1px solid ${lightGray};
  border: none;
  background-color: ${vscBackground};
  color: ${vscForeground};

  &:focus {
    background: ${secondaryDark};
  }
`;

export const Select = styled.select`
  padding: 8px 12px;
  margin: 8px 0;
  box-sizing: border-box;
  border-radius: ${defaultBorderRadius};
  outline: 1px solid ${lightGray};
  border: none;
  background-color: ${vscBackground};
  color: ${vscForeground};
`;

export const Label = styled.label<{ fontSize?: number }>`
  font-size: ${(props) => props.fontSize || getFontSize()}px;
`;

const spin = keyframes`
  from {
    -webkit-transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
  }
`;

export const Loader = styled.div`
  border: 4px solid transparent;
  border-radius: 50%;
  border-top: 4px solid white;
  width: 36px;
  height: 36px;
  -webkit-animation: ${spin} 1s ease-in-out infinite;
  animation: ${spin} 1s ease-in-out infinite;
  margin: auto;
`;

export const MainContainerWithBorder = styled.div<{ borderWidth?: string }>`
  border-radius: ${defaultBorderRadius};
  padding: ${(props) => props.borderWidth || "1px"};
  background-color: white;
`;

export const MainTextInput = styled.textarea`
  padding: 8px;
  font-size: 16px;
  border-radius: ${defaultBorderRadius};
  border: 1px solid #ccc;
  margin: 8px 8px;
  background-color: ${vscBackground};
  color: ${vscForeground};
  outline: 1px solid orange;
  resize: none;
`;

export const appear = keyframes`
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0px);
    }
`;

export const HeaderButton = styled.button<{ inverted: boolean | undefined }>`
  background-color: ${({ inverted }) =>
    inverted ? vscForeground : "transparent"};
  color: ${({ inverted }) => (inverted ? vscBackground : vscForeground)};

  border: none;
  border-radius: ${defaultBorderRadius};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};

  &:focus {
    outline: none;
    border: none;
  }

  &:hover {
    background-color: ${({ inverted }) =>
      typeof inverted === "undefined" || inverted
        ? secondaryDark
        : "transparent"};
  }
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px;
`;
