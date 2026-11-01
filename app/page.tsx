import Controls from "@/components/cover/Controls";
import Canvas from "@/components/cover/Canvas";

export default function Home() {
  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background md:flex-row">
      <Controls />
      <Canvas />
    </main>
  );
}
