/**
 * The orange bar graphic that closes the home page. Purely decorative: two
 * clusters of gradient bars, clipped by the page edge, matching the reference.
 */

const clusterA = [42, 62, 82, 96, 74, 56];
const clusterB = [48, 66, 74, 88, 100, 68, 92];

function Cluster({
  heights,
  className,
}: {
  heights: number[];
  className?: string;
}) {
  return (
    <div className={`flex h-full flex-1 items-end gap-0.5 ${className ?? ""}`}>
      {heights.map((height, i) => (
        <div
          key={i}
          style={{ height: `${height}%` }}
          className="flex-1 bg-linear-to-b from-transparent to-primary-300"
        />
      ))}
    </div>
  );
}

export function AccentBars() {
  return (
    <div aria-hidden className="h-44 overflow-hidden">
      {/* Taller than its frame, so the bars run off the bottom of the page as they do in the reference. */}
      <div className="mx-auto flex h-56 w-full max-w-[1440px] items-stretch gap-[10%] px-2 blur-[3px]">
        <Cluster heights={clusterA} />
        <Cluster heights={clusterB} className="grow-[1.3]" />
      </div>
    </div>
  );
}
