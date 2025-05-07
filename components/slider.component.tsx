import * as Slider from "@radix-ui/react-slider";
import * as React from "react";

const SliderComponent = (props: Slider.SliderProps) => (
  <form>
    <Slider.Root
      className="relative flex h-5 w-full cursor-default z-50 touch-none select-none items-center"
      defaultValue={[50]}
      max={100}
      step={1}
      {...props}
    >
      <Slider.Track className="relative h-[3px] grow rounded-full bg-white">
        <Slider.Range className="absolute h-full rounded-full bg-white" />
      </Slider.Track>

      <Slider.Thumb
        className="block size-[32px] rounded-full  cursor-default bg-gray-500 hover:bg-violet3 focus:shadow-[0_0_0_1px] focus:shadow-whitepele focus:outline-none"
        aria-label="Volume"
      />
    </Slider.Root>
  </form>
);

export default SliderComponent;
