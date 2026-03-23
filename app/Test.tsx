"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Test() {
  const [count, setCount] = useState(0);

  return  (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Counter: {count}</h1>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
      <Button onClick={() => setCount(count - 1)}>Decrement</Button>
      <Button onClick={() => setCount(0)}>Reset</Button>
    </div> 
  )
}