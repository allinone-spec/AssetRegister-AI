import loginImg from "../../assets/logo.png";

export function LeftPanel({ accent }) {
  return (
    <div
      className="lg:w-[45%] w-full p-10 lg:p-12 flex-col justify-between relative overflow-hidden hidden lg:flex"
      style={{
        background: `linear-gradient(145deg,${accent},${accent}bb,${accent}77)`,
      }}
    >
      <div className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full bg-white/10" />
      <div className="absolute -top-16 right-[60px] w-[200px] h-[200px] rounded-full bg-white/10" />
      <div className="absolute bottom-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full bg-white/10" />

      {/* Brand */}
      <div>
        <img
          src={loginImg}
          alt="Company Logo"
          className="w-[300px] h-[100px] object-contain ml-[-40px]"
        />
        <h1 className="text-white text-6xl font-extrabold mb-4 mt-20">
          Manage your <p className="text-white/70">digital assets</p>
          with confidence.
        </h1>
        <p className="text-white/60 max-w-sm text-lg mt-5">
          <p> Centralise, monitor, and automate all your</p>
          <p>enterprise asset imports across every integration </p>
          <p>in one place.</p>
        </p>
      </div>

      {/* <div className="hidden lg:flex bg-white/10 backdrop-blur rounded-xl overflow-hidden">
        {[
          ["6,314", "Assets"],
          ["13", "Integrations"],
          ["99.2%", "Uptime"],
        ].map(([v, l], i) => (
          <div
            key={i}
            className="flex-1 p-4 text-white border-r border-white/20 last:border-none"
          >
            <div className="font-extrabold text-xl">{v}</div>
            <div className="text-xs text-white/60">{l}</div>
          </div>
        ))}
      </div> */}
      {/* <div className="hidden lg:flex bg-white/10 backdrop-blur rounded-xl overflow-hidden"> */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center font-black text-white">
            AR
          </div>
          <div>
            <div className="text-white font-extrabold">AssetRegister</div>
            <div className="text-white/60 text-xs uppercase tracking-widest font-semibold">
              Enterprise Suite
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
