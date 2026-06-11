"use client";

import {
  motion,
  useReducedMotion,
} from "motion/react";
import React, { useMemo } from "react";

const ENTRY_EASE = [0.16, 1, 0.3, 1];
const EXIT_EASE = [0.65, 0, 0.35, 1];

const ROOT_STYLE = {
  display: "inline-flex",
  flexWrap: "wrap",
  perspective: "600px",
};
const WORD_STYLE = {
  display: "inline-flex",
  marginRight: "0.35em",
  whiteSpace: "nowrap",
};
const LETTER_STYLE = {
  display: "inline-block",
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
};

export function TextSpin({
  text,
  trigger = true,
  wordStagger = 0.14,
  letterStagger = 0.04,
  entryDuration = 0.8,
  exitDuration = 0.6,
  className,
  style,
  ...rest
}) {
  const reduced = useReducedMotion();

  const { root, word, letter } = useMemo(
    () => ({
      root: {
        hidden: {},
        visible: { transition: { staggerChildren: wordStagger } },
        gone: { transition: { staggerChildren: wordStagger * 0.5 } },
      },
      word: {
        hidden: {},
        visible: { transition: { staggerChildren: letterStagger } },
        gone: { transition: { staggerChildren: letterStagger * 0.6 } },
      },
      letter: {
        hidden: { opacity: 0, rotateX: -90, y: "0.35em" },
        visible: {
          opacity: 1,
          rotateX: 0,
          y: 0,
          transition: { duration: entryDuration, ease: ENTRY_EASE },
        },
        gone: {
          opacity: 0,
          rotateX: 90,
          y: "-0.35em",
          transition: { duration: exitDuration, ease: EXIT_EASE },
        },
      },
    }),
    [wordStagger, letterStagger, entryDuration, exitDuration]
  );

  if (reduced) {
    return (
      <motion.span {...rest} className={className} style={style}>
        {text}
      </motion.span>
    );
  }

  return (
    <motion.span
      {...rest}
      className={className}
      style={{ ...ROOT_STYLE, ...style }}
      variants={root}
      initial="hidden"
      animate={trigger ? "visible" : "gone"}
    >
      {text.split(" ").map((w, wi) => (
        <motion.span key={wi} style={WORD_STYLE} variants={word}>
          {Array.from(w).map((ch, ci) => (
            <motion.span key={ci} style={LETTER_STYLE} variants={letter}>
              {ch}
            </motion.span>
          ))}
        </motion.span>
      ))}
    </motion.span>
  );
}

TextSpin.displayName = "TextSpin";
export default TextSpin;
