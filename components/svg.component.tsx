import { ComponentPropsWithRef, FC } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IconList = [
  "caret-right",
  "caret-left",
  "play-fill",
  "arrow-up",
  "clock",
] as const;

export type IconType = (typeof IconList)[number];

interface IProps extends ComponentPropsWithRef<"svg"> {
  iconName: IconType;
  width?: number;
  height?: number;
}

const SVG: FC<IProps> = ({
  iconName,
  width = 20,
  height = 20,
  ...otherProps
}) => {
  return (
    <svg style={{ height, width }} {...otherProps}>
      <use xlinkHref={`/sprite.svg#${iconName}`}></use>
    </svg>
  );
};

export default SVG;
