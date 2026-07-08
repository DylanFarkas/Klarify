import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { Scene01LightIntro } from "./scenes/Scene01LightIntro";
import { Scene02Agent1Capture } from "./scenes/Scene02Agent1Capture";
import { Scene03Agent2Backlog } from "./scenes/Scene03Agent2Backlog";
import { Scene04EstimationPriority } from "./scenes/Scene04EstimationPriority";
import { Scene05Sprints } from "./scenes/Scene05Sprints";
import { Scene06Dashboard } from "./scenes/Scene06Dashboard";
import { Scene07Kanban } from "./scenes/Scene07Kanban";
import { Scene08GithubExport } from "./scenes/Scene08GithubExport";
import { Scene09Closing } from "./scenes/Scene09Closing";

const SLIDE_TIMING = linearTiming({ durationInFrames: 15 });

export const MyComposition: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene01LightIntro />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene02Agent1Capture />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene03Agent2Backlog />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene04EstimationPriority />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={110}>
        <Scene05Sprints />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene06Dashboard />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene07Kanban />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={100}>
        <Scene08GithubExport />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={SLIDE_TIMING}
      />

      <TransitionSeries.Sequence durationInFrames={110}>
        <Scene09Closing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
