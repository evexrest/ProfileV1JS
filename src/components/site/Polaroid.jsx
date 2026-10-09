// A photo in a paper frame, hung a little crooked. It drifts up and down on
// its own, and straightens and leans in when the pointer is over it. The
// motion itself is in index.css, under "the photo".
export function Polaroid({ src, alt, caption, tilt = 3 }) {
  return (
    <div className="polaroid w-48 max-w-full in-[.arranged]:w-full">
      <figure
        className="relative m-0 bg-[#f4f1ea] p-2 pb-8 shadow-2xl shadow-black/50"
        style={{ "--tilt": tilt + "deg" }}
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
        </div>
        <figcaption className="absolute right-0 bottom-2.5 left-0 text-center font-mono text-[0.625rem] tracking-[0.15em] text-neutral-600 uppercase">
          {caption}
        </figcaption>
      </figure>
    </div>
  )
}
