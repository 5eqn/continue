import React, { useState } from "react";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";
import { HeaderButton, StyledTooltip, defaultBorderRadius } from ".";

interface HeaderButtonWithTextProps {
  text: string;
  onClick?: (e: any) => void;
  children: React.ReactNode;
  disabled?: boolean;
  inverted?: boolean;
  active?: boolean;
}

const HeaderButtonWithText = (props: HeaderButtonWithTextProps) => {
  const [hover, setHover] = useState(false);
  return (
    <>
      <HeaderButton
        data-tooltip-id={`header_button_${props.text}`}
        inverted={props.inverted}
        disabled={props.disabled}
        onMouseEnter={() => {
          if (!props.disabled) {
            setHover(true);
          }
        }}
        onMouseLeave={() => {
          setHover(false);
        }}
        onClick={props.onClick}
      >
        {props.children}
      </HeaderButton>
      <StyledTooltip id={`header_button_${props.text}`} place="bottom">
        {props.text}
      </StyledTooltip>
    </>
  );
};

export default HeaderButtonWithText;
