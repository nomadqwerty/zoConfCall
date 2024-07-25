import { FullRtc } from "@/Components/FullRTC/FullRtc";
import { Suspense } from "react";
import Lobby from "@/Components/FullRTC/Lobby";
import Link from "next/link";

export default function Rtc() {
  return (
    <Suspense>
      <FullRtc></FullRtc>
    </Suspense>
  );
}
