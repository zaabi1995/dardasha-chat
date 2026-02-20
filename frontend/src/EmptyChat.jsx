export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-wa-darker border-b-[6px] border-wa-green">
      <div className="mb-8">
        <svg viewBox="0 0 303 172" width="300" height="170" className="text-wa-textSec opacity-20">
          <path fill="currentColor" d="M229.565 160.229c32.647-16.166 55.003-50.503 55.003-90.229C284.568 31.34 253.228 0 214.568 0c-28.077 0-52.392 16.547-63.5 40.42C139.96 16.547 115.645 0 87.568 0 48.908 0 17.568 31.34 17.568 70c0 39.726 22.356 74.063 54.003 90.229L151.068 172l78.497-11.771z"/>
        </svg>
      </div>
      <h2 className="text-wa-text text-3xl font-light mb-3">BHD Chat for Web</h2>
      <p className="text-wa-textSec text-sm text-center max-w-md leading-relaxed">
        Send and receive WhatsApp messages through your Dardasha lines.
        <br />Select a chat from the sidebar to get started.
      </p>
      <div className="mt-8 flex items-center gap-2 text-wa-textSec text-xs">
        <svg viewBox="0 0 10 12" width="10" height="12" fill="currentColor"><path d="M5.002 12.064c.882 0 1.597-.716 1.597-1.598H3.405c0 .882.715 1.598 1.597 1.598zm5.31-3.737V5.24c0-2.717-1.44-4.993-3.985-5.593V.266A1.327 1.327 0 0 0 5 -1.062c-.731 0-1.325.594-1.325 1.328v.381C1.131.247-.31 2.523-.31 5.24v3.087L-1.9 9.921v.797h13.804v-.797l-1.592-1.594z"/></svg>
        <span>End-to-end encrypted via Dardasha</span>
      </div>
    </div>
  );
}
