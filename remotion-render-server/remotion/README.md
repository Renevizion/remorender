# Example Remotion Compositions

Place your Remotion compositions in this directory.

## Example Structure

```
remotion/
├── index.tsx          # Main entry point
├── Video.tsx          # Your video composition
└── Root.tsx           # Root component
```

## Example Composition

Create `index.tsx`:
```tsx
import { Composition } from 'remotion';
import { MyVideo } from './Video';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

Create `Video.tsx`:
```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0e27',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          color: '#53a8ff',
          fontSize: 72,
          opacity,
        }}
      >
        Hello from Remotion!
      </h1>
    </AbsoluteFill>
  );
};
```
