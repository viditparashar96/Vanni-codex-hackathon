/**
 * ProviderIcon — a small brand mark for AI / speech providers, used to
 * decorate the model / voice / STT / TTS pickers throughout the builder.
 *
 * Brand SVGs are inlined below so the component is self-contained (no external
 * asset fetches). Two visual families:
 *   - MONO marks (single-colour logos, e.g. OpenAI) paint with `currentColor`
 *     so they inherit the surrounding text colour and stay legible in both
 *     light and dark themes.
 *   - COLOR marks (multi-colour brand logos, e.g. Gemini's gradient) keep their
 *     own brand colours; their gradient ids are namespaced per instance with
 *     `useId` to avoid collisions when several icons render on one page.
 *
 * Unknown providers fall back to a neutral lettered circle.
 */

import { useId, type ReactElement } from "react";

import { cn } from "@/lib/utils";

// ── Brand marks ──────────────────────────────────────────────────────────────
// Each entry is a component so colour marks can call `useId` for unique
// gradient ids. Mono marks use `fill="currentColor"`.

type IconComponent = () => ReactElement;

const OpenAIIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
  </svg>
);

const AnthropicIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
  </svg>
);

const GroqIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z" />
  </svg>
);

const ElevenLabsIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 0h5v24H5V0zM14 0h5v24h-5V0z" />
  </svg>
);

const AssemblyAIIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.595 1.5a3.695 3.695 0 00-3.444 2.355L0 22.26h5.432l5.629-14.486h.002a.96.96 0 011.782 0h.75V4.835h-1.393L13.498 1.5h-2.902z" />
    <path d="M7.151 3.855a3.695 3.695 0 013.26-2.35l-.002-.005H13.405c1.524 0 2.893.936 3.444 2.355L24 22.26h-5.525L11.54 4.413a2.528 2.528 0 00-4.609.006l.22-.564z" />
  </svg>
);

const DeepgramIcon: IconComponent = () => (
  <svg viewBox="0 0 24 24" fill="#13EF93" role="img" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.203 24H1.517a.364.364 0 0 1-.258-.62l6.239-6.275a.366.366 0 0 1 .259-.108h3.52c2.723 0 5.025-2.127 5.107-4.845a5.004 5.004 0 0 0-4.999-5.148H7.613v4.646c0 .2-.164.364-.365.364H.968a.365.365 0 0 1-.363-.364V.364C.605.164.768 0 .969 0h10.416c6.684 0 12.111 5.485 12.01 12.187C23.293 18.77 17.794 24 11.202 24z" />
  </svg>
);

const CartesiaIcon: IconComponent = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="6" fill="#309D4B" />
    <path
      d="M46.8196 27.8701V35.4204H43.0782L42.5873 34.7408L41.4102 33.1116L40.6088 32.0024L39.2386 30.1062L39.653 32.0024L40.2517 34.7408L40.4001 35.4204L40.8505 37.4792L41.4102 40.0407L41.4489 40.2176L42.0473 42.9557L42.6461 45.6941H34.1974L33.5986 42.9557L33.2955 41.5686L33.0002 40.2176L32.4015 37.4792L31.9515 35.4204L31.5014 37.4792L30.9027 40.2176L30.591 41.6435L30.3043 42.9557L29.7055 45.6941H21.2405L21.8392 42.9557L22.4213 40.2918V40.2914L22.4763 40.2508L22.5213 40.2176L25.1812 38.2477L26.2192 37.4792L27.8861 36.2446L28.9992 35.4204H17.0669V27.8701H25.1366L25.1812 27.6668L25.4308 26.5259L26.0292 23.7875L26.6279 21.0491L27.2263 18.311H36.6602L37.2586 21.0491L37.3839 21.6221L36.0004 22.6466L34.4596 23.7875L33.2955 24.6497L30.7621 26.5259L30.591 26.6524L28.9468 27.8701H46.8196Z"
      fill="#F4F4F1"
    />
  </svg>
);

const GoogleIcon: IconComponent = () => {
  const uid = useId();
  const path =
    "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z";
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill="#3186FF" />
      <path d={path} fill={`url(#${uid}-0)`} />
      <path d={path} fill={`url(#${uid}-1)`} />
      <path d={path} fill={`url(#${uid}-2)`} />
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-0`} x1="7" x2="11" y1="15.5" y2="12">
          <stop stopColor="#08B962" />
          <stop offset="1" stopColor="#08B962" stopOpacity="0" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-1`} x1="8" x2="11.5" y1="5.5" y2="11">
          <stop stopColor="#F94543" />
          <stop offset="1" stopColor="#F94543" stopOpacity="0" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-2`} x1="3.5" x2="17.5" y1="13.5" y2="12">
          <stop stopColor="#FABC12" />
          <stop offset=".46" stopColor="#FABC12" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const AzureIcon: IconComponent = () => {
  const uid = useId();
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.242 1.613A1.11 1.11 0 018.295.857h6.977L8.03 22.316a1.11 1.11 0 01-1.052.755h-5.43a1.11 1.11 0 01-1.053-1.466L7.242 1.613z"
        fill={`url(#${uid}-0)`}
      />
      <path
        d="M18.397 15.296H7.4a.51.51 0 00-.347.882l7.066 6.595c.206.192.477.298.758.298h6.226l-2.706-7.775z"
        fill="#0078D4"
      />
      <path
        d="M15.272.857H7.497L0 23.071h7.775l1.596-4.73 5.068 4.73h6.665l-2.707-7.775h-7.998L15.272.857z"
        fill={`url(#${uid}-1)`}
      />
      <path
        d="M17.193 1.613a1.11 1.11 0 00-1.052-.756h-7.81.035c.477 0 .9.304 1.052.756l6.748 19.992a1.11 1.11 0 01-1.052 1.466h-.12 7.895a1.11 1.11 0 001.052-1.466L17.193 1.613z"
        fill={`url(#${uid}-2)`}
      />
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-0`} x1="8.247" x2="1.002" y1="1.626" y2="23.03">
          <stop stopColor="#114A8B" />
          <stop offset="1" stopColor="#0669BC" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-1`} x1="14.042" x2="12.324" y1="15.302" y2="15.888">
          <stop stopOpacity=".3" />
          <stop offset=".071" stopOpacity=".2" />
          <stop offset=".321" stopOpacity=".1" />
          <stop offset=".623" stopOpacity=".05" />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-2`} x1="12.841" x2="20.793" y1="1.626" y2="22.814">
          <stop stopColor="#3CCBF4" />
          <stop offset="1" stopColor="#2892DF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const QwenIcon: IconComponent = () => {
  const uid = useId();
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z"
        fill={`url(#${uid})`}
        fillRule="nonzero"
      />
      <defs>
        <linearGradient id={uid} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#6336E7" stopOpacity=".84" />
          <stop offset="100%" stopColor="#6F69F7" stopOpacity=".84" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const MetaIcon: IconComponent = () => {
  const uid = useId();
  const g = (n: number) => `url(#${uid}-${n})`;
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.897 4h-.024l-.031 2.615h.022c1.715 0 3.046 1.357 5.94 6.246l.175.297.012.02 1.62-2.438-.012-.019a48.763 48.763 0 00-1.098-1.716 28.01 28.01 0 00-1.175-1.629C10.413 4.932 8.812 4 6.896 4z" fill={g(0)} />
      <path d="M6.873 4C4.95 4.01 3.247 5.258 2.02 7.17a4.352 4.352 0 00-.01.017l2.254 1.231.011-.017c.718-1.083 1.61-1.774 2.568-1.785h.021L6.896 4h-.023z" fill={g(1)} />
      <path d="M2.019 7.17l-.011.017C1.2 8.447.598 9.995.274 11.664l-.005.022 2.534.6.004-.022c.27-1.467.786-2.828 1.456-3.845l.011-.017L2.02 7.17z" fill={g(2)} />
      <path d="M2.807 12.264l-2.533-.6-.005.022c-.177.918-.267 1.851-.269 2.786v.023l2.598.233v-.023a12.591 12.591 0 01.21-2.44z" fill={g(3)} />
      <path d="M2.677 15.537a5.462 5.462 0 01-.079-.813v-.022L0 14.468v.024a8.89 8.89 0 00.146 1.652l2.535-.585a4.106 4.106 0 01-.004-.022z" fill={g(4)} />
      <path d="M3.27 16.89c-.284-.31-.484-.756-.589-1.328l-.004-.021-2.535.585.004.021c.192 1.01.568 1.85 1.106 2.487l.014.017 2.018-1.745a2.106 2.106 0 01-.015-.016z" fill={g(5)} />
      <path d="M10.78 9.654c-1.528 2.35-2.454 3.825-2.454 3.825-2.035 3.2-2.739 3.917-3.871 3.917a1.545 1.545 0 01-1.186-.508l-2.017 1.744.014.017C2.01 19.518 3.058 20 4.356 20c1.963 0 3.374-.928 5.884-5.33l1.766-3.13a41.283 41.283 0 00-1.227-1.886z" fill="#0082FB" />
      <path d="M13.502 5.946l-.016.016c-.4.43-.786.908-1.16 1.416.378.483.768 1.024 1.175 1.63.48-.743.928-1.345 1.367-1.807l.016-.016-1.382-1.24z" fill={g(6)} />
      <path d="M20.918 5.713C19.853 4.633 18.583 4 17.225 4c-1.432 0-2.637.787-3.723 1.944l-.016.016 1.382 1.24.016-.017c.715-.747 1.408-1.12 2.176-1.12.826 0 1.6.39 2.27 1.075l.015.016 1.589-1.425-.016-.016z" fill="#0082FB" />
      <path d="M23.998 14.125c-.06-3.467-1.27-6.566-3.064-8.396l-.016-.016-1.588 1.424.015.016c1.35 1.392 2.277 3.98 2.361 6.971v.023h2.292v-.022z" fill={g(7)} />
      <path d="M23.998 14.15v-.023h-2.292v.022c.004.14.006.282.006.424 0 .815-.121 1.474-.368 1.95l-.011.022 1.708 1.782.013-.02c.62-.96.946-2.293.946-3.91 0-.083 0-.165-.002-.247z" fill={g(8)} />
      <path d="M21.344 16.52l-.011.02c-.214.402-.519.67-.917.787l.778 2.462a3.493 3.493 0 00.438-.182 3.558 3.558 0 001.366-1.218l.044-.065.012-.02-1.71-1.784z" fill={g(9)} />
      <path d="M19.92 17.393c-.262 0-.492-.039-.718-.14l-.798 2.522c.449.153.927.222 1.46.222.492 0 .943-.073 1.352-.215l-.78-2.462c-.167.05-.341.075-.517.073z" fill={g(10)} />
      <path d="M18.323 16.534l-.014-.017-1.836 1.914.016.017c.637.682 1.246 1.105 1.937 1.337l.797-2.52c-.291-.125-.573-.353-.9-.731z" fill={g(11)} />
      <path d="M18.309 16.515c-.55-.642-1.232-1.712-2.303-3.44l-1.396-2.336-.011-.02-1.62 2.438.012.02.989 1.668c.959 1.61 1.74 2.774 2.493 3.585l.016.016 1.834-1.914a2.353 2.353 0 01-.014-.017z" fill={g(12)} />
      <defs>
        <linearGradient id={`${uid}-0`} x1="75.897%" x2="26.312%" y1="89.199%" y2="12.194%">
          <stop offset=".06%" stopColor="#0867DF" />
          <stop offset="45.39%" stopColor="#0668E1" />
          <stop offset="85.91%" stopColor="#0064E0" />
        </linearGradient>
        <linearGradient id={`${uid}-1`} x1="21.67%" x2="97.068%" y1="75.874%" y2="23.985%">
          <stop offset="13.23%" stopColor="#0064DF" />
          <stop offset="99.88%" stopColor="#0064E0" />
        </linearGradient>
        <linearGradient id={`${uid}-2`} x1="38.263%" x2="60.895%" y1="89.127%" y2="16.131%">
          <stop offset="1.47%" stopColor="#0072EC" />
          <stop offset="68.81%" stopColor="#0064DF" />
        </linearGradient>
        <linearGradient id={`${uid}-3`} x1="47.032%" x2="52.15%" y1="90.19%" y2="15.745%">
          <stop offset="7.31%" stopColor="#007CF6" />
          <stop offset="99.43%" stopColor="#0072EC" />
        </linearGradient>
        <linearGradient id={`${uid}-4`} x1="52.155%" x2="47.591%" y1="58.301%" y2="37.004%">
          <stop offset="7.31%" stopColor="#007FF9" />
          <stop offset="100%" stopColor="#007CF6" />
        </linearGradient>
        <linearGradient id={`${uid}-5`} x1="37.689%" x2="61.961%" y1="12.502%" y2="63.624%">
          <stop offset="7.31%" stopColor="#007FF9" />
          <stop offset="100%" stopColor="#0082FB" />
        </linearGradient>
        <linearGradient id={`${uid}-6`} x1="34.808%" x2="62.313%" y1="68.859%" y2="23.174%">
          <stop offset="27.99%" stopColor="#007FF8" />
          <stop offset="91.41%" stopColor="#0082FB" />
        </linearGradient>
        <linearGradient id={`${uid}-7`} x1="43.762%" x2="57.602%" y1="6.235%" y2="98.514%">
          <stop offset="0%" stopColor="#0082FB" />
          <stop offset="99.95%" stopColor="#0081FA" />
        </linearGradient>
        <linearGradient id={`${uid}-8`} x1="60.055%" x2="39.88%" y1="4.661%" y2="69.077%">
          <stop offset="6.19%" stopColor="#0081FA" />
          <stop offset="100%" stopColor="#0080F9" />
        </linearGradient>
        <linearGradient id={`${uid}-9`} x1="30.282%" x2="61.081%" y1="59.32%" y2="33.244%">
          <stop offset="0%" stopColor="#027AF3" />
          <stop offset="100%" stopColor="#0080F9" />
        </linearGradient>
        <linearGradient id={`${uid}-10`} x1="20.433%" x2="82.112%" y1="50.001%" y2="50.001%">
          <stop offset="0%" stopColor="#0377EF" />
          <stop offset="99.94%" stopColor="#0279F1" />
        </linearGradient>
        <linearGradient id={`${uid}-11`} x1="40.303%" x2="72.394%" y1="35.298%" y2="57.811%">
          <stop offset=".19%" stopColor="#0471E9" />
          <stop offset="100%" stopColor="#0377EF" />
        </linearGradient>
        <linearGradient id={`${uid}-12`} x1="32.254%" x2="68.003%" y1="19.719%" y2="84.908%">
          <stop offset="27.65%" stopColor="#0867DF" />
          <stop offset="100%" stopColor="#0471E9" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/** Canonical icon id → inlined brand mark. */
const ICONS: Record<string, IconComponent> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  groq: GroqIcon,
  meta: MetaIcon,
  qwen: QwenIcon,
  deepgram: DeepgramIcon,
  assemblyai: AssemblyAIIcon,
  azure: AzureIcon,
  cartesia: CartesiaIcon,
  elevenlabs: ElevenLabsIcon,
};

/** Catalog / backend ids that alias onto a canonical icon id. */
const PROVIDER_ALIASES: Record<string, string> = {
  openai_whisper: "openai",
  openai_realtime: "openai",
  "openai-realtime": "openai",
  gemini_live: "google",
  gemini: "google",
  google_gemini: "google",
  azure_speech: "azure",
  microsoft: "azure",
  "meta-llama": "meta",
};

/** Resolve a catalog provider id to a canonical icon id (or null if unknown). */
export function resolveProviderIcon(provider?: string | null): string | null {
  if (!provider) return null;
  const id = PROVIDER_ALIASES[provider] ?? provider.toLowerCase();
  return id in ICONS ? id : null;
}

/**
 * Best-effort provider inference from a model / voice id, for places where we
 * only have the raw model string (e.g. call-history technical details).
 */
export function providerForModel(modelId?: string | null): string | null {
  if (!modelId) return null;
  const m = modelId.toLowerCase();
  if (m.startsWith("openai/") || m.includes("gpt-oss")) return "openai";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) return "openai";
  if (m.startsWith("whisper") || m.startsWith("tts-1")) return "openai";
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini")) return "google";
  if (m.startsWith("llama") || m.startsWith("meta-llama/")) return "meta";
  if (m.startsWith("qwen")) return "qwen";
  if (m.startsWith("nova-") || m.startsWith("aura-")) return "deepgram";
  if (m.startsWith("sonic")) return "cartesia";
  if (m.startsWith("eleven")) return "elevenlabs";
  if (m.startsWith("universal")) return "assemblyai";
  return null;
}

export interface ProviderIconProps {
  /** Provider id as used in the catalogs (e.g. "openai", "gemini_live"). */
  provider?: string | null;
  className?: string;
  /** Letter used by the unknown-provider fallback; defaults to the provider id's first letter. */
  fallbackLabel?: string;
}

/**
 * `<ProviderIcon provider="openai" className="size-4" />`
 *
 * Renders the brand mark for a provider, or a neutral lettered circle when we
 * don't have an icon. Always aria-hidden — pair it with a visible text label.
 */
export function ProviderIcon({ provider, className, fallbackLabel }: ProviderIconProps) {
  const id = resolveProviderIcon(provider);
  const Icon = id ? ICONS[id] : null;

  if (Icon) {
    return (
      <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center [&>svg]:size-full", className)}>
        <Icon />
      </span>
    );
  }

  const letter = (fallbackLabel || provider || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-muted text-[0.55em] font-semibold leading-none text-muted-foreground",
        className
      )}
    >
      {letter}
    </span>
  );
}
