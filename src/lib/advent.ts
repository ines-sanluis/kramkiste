/**
 * Adventskalender content.
 *
 * SERVER-ONLY: only import this from server components. The page sends the
 * content of a door to the browser only once that door is unlocked, so
 * nothing can be peeked at early through dev tools.
 *
 * How to fill it in:
 *   - Edit `title`, `text`, `link`, etc. Lines marked `// TODO` are placeholders.
 *   - Photos and voice memos go in `public/advent/` and are referenced as
 *     "/advent/<file>". (Files in public/ are reachable by anyone who guesses
 *     the URL, so use non-obvious names, e.g. "/advent/foto-7xk2.jpg".)
 *   - `text` supports paragraphs: separate them with a blank line ("\n\n").
 *
 * Doors after the 24th are bonus doors. They stay completely hidden until the
 * 24th, so the "your calendar keeps going until I'm back" twist is a surprise.
 */

export type DoorKind =
  | "note"
  | "photo"
  | "song"
  | "voice"
  | "poem"
  | "recipe"
  | "voucher"
  | "activity"
  | "letter"
  | "memory";

export type Door = {
  /** Day this door unlocks, Munich time, "YYYY-MM-DD". */
  date: string;
  kind: DoorKind;
  title: string;
  text?: string;
  /** e.g. Spotify/YouTube link, recipe link, poem link. */
  link?: { href: string; label: string };
  /** "/advent/xyz.jpg" */
  image?: string;
  imageAlt?: string;
  /** "/advent/xyz.m4a" (m4a/mp3 both play on iPhone) */
  audio?: string;
  /** For memories: when/where it happened, e.g. "Sommer 2025, Gardasee". */
  memoryWhen?: string;
  /** Rendered as a little ticket. */
  voucher?: { what: string; when: string; fine?: string };
};

/** The hub card and the calendar appear on this day. */
export const ADVENT_START = "2026-12-01";

/** TODO: the day you're back. The last bonus door opens on this day. */
export const RETURN_DATE = "2027-01-10";

export const DOORS: Door[] = [
  // ── Week 1: movie night ───────────────────────────────────────────────
  {
    date: "2026-12-01",
    kind: "note",
    title: "Türchen Nummer eins",
    text: "Mi amor, este es el calendario de adviento que he hecho para ti. Cada día podrás abrir una puerta con una pequeña sorpresa dentro. Algunas serán tonterías, otras quizás te gusten más, pero todas están hechas con mucho cariño.\n\nNo son regalos grandes, pero espero que te saquen una sonrisa y te recuerden lo mucho que te quiero.\n\nNos vemos mañana 🎄💚",},
  {
    date: "2026-12-02",
    kind: "voucher",
    title: "Morgen haben wir was vor",
    voucher: {
      what: "Kinoabend 🎬",
      when: "Donnerstag, 3.12. · 20:00",
      fine: "Komm zurück und entdecke, welchen Film wir sehen werden.",
    },
  },
  {
    date: "2026-12-03",
    kind: "activity",
    title: "Dolor y gloria",
    text: "Esta noche toca Dolor y gloria, de Almodóvar, en el Rio Filmpalast\n\nSi quieres, te espero a las 18:50 en mi casa para picar algo antes con calma. Y tranquila, que hay subtítulos en alemán y las palomitas corren de mi cuenta 🍿",  },
  {
    date: "2026-12-04",
    kind: "photo",
    title: "Ein Foto von uns",
    image: "/advent/TODO-foto-1.jpg",
    imageAlt: "", // TODO
    text: "The story behind the photo.", // TODO
  },
  {
    date: "2026-12-05",
    kind: "voice",
    title: "Eine Sprachnachricht",
    audio: "/advent/TODO-memo-1.m4a",
    text: "(She's away this weekend.)", // TODO
  },
  {
    date: "2026-12-06",
    kind: "song",
    title: "Ein Lied für dich",
    link: { href: "https://open.spotify.com/track/21kvgs0G8zIKu4B4wNslzW?si=a326bbf565ea4d7b", label: "Anhören" },
    text: "Esta canción siempre me ha precido divertida, y bueno, digamos que el sexo contigo también lo es!! Como cuando decides sazonarme con trufa o tomar pudding de mi pezón jaja Bueno, que me recuerda a ciertas cosas que me encanta hacer contigo… y que no me importaría hacer todo el rato 🐰",  },

  // ── Week 2: ice skating ───────────────────────────────────────────────
  {
    date: "2026-12-07",
    kind: "note",
    title: "Ein kleiner Zettel",
    text: "Cute note.", // TODO
  },
  {
    date: "2026-12-08",
    kind: "poem",
    title: "Ein Gedicht",
    text: [
      "Pienso mesa y digo silla,\ncompro pan y me lo dejo,\nlo que aprendo se me olvida,\nlo que pasa es que te quiero.",
      "— Gloria Fuertes",
    ].join("\n\n"),
  },
  {
    date: "2026-12-09",
    kind: "voucher",
    title: "Noch ein Gutschein!",
    voucher: {
      what: "Eislaufen ⛸️",
      when: "Samstag, 12.12.",
      fine: "Händchenhalten ist Pflicht.", // TODO
    },
  },
  {
    date: "2026-12-10",
    kind: "memory",
    title: "Ein Tag am Meer",
    memoryWhen: "Sommer 2026, Galicia", // optional
    text: "¿Te acuerdas de aquel día en O Trece? Seguro que si te digo el nombre no sabes de qué hablo jaja Tomamos el sol, jugamos a las palas y vimos a los peces saltar entre las olas.\n\n Estábamos prácticamente solas (aunque no lo suficiente...). Nos quedamos a ver el atardecer, cenamos allí y dormimos con el ruido del mar. Y a la mañana siguiente te desperté con un café.\n\nDe mis días favoritos contigo 🌊",
  },
  {
    date: "2026-12-11",
    kind: "song",
    title: "Ein Lied",
    link: { href: "https://open.spotify.com/", label: "Anhören" },
  },
  {
    date: "2026-12-12",
    kind: "activity",
    title: "Heute: Eislaufen!",
    text: "Note for skating day.", // TODO
  },
  {
    date: "2026-12-13",
    kind: "recipe",
    title: "Heute kochen wir",
    text: "Hoy toca cocinar juntas, pero tú decides 👩‍🍳\n\n¿Dulce? Probamos a hacer galletas navideñas (prometo no estresarme demasiado en la cocina jaja).\n\n¿Salado? Pues algo rico que nos apetezca a las dos.\n\n¿Pereza total? También vale: eliges un restaurante que te guste y te invito yo!",
    link: {
      href: "https://www.hola.com/cocina/noticiaslibros/galeria/20201204180314/galletas-de-navidad/1",
      label: "Ideas de galletas",
    },  
  },
  // ── Week 3: massage ───────────────────────────────────────────────────
  {
    date: "2026-12-14",
    kind: "voucher",
    title: "Gutschein Nummer drei",
    voucher: {
      what: "Massage zu zweit 💆",
      when: "Mittwoch, 16.12.",
      fine: "Geht auf mich 💛",
    },
  },
  {
    date: "2026-12-15",
    kind: "memory",
    title: "Name of the memory", // TODO
    // memoryWhen: "Sommer 2025, Gardasee", // optional
    text: "Another memory.", // TODO
  },
  {
    date: "2026-12-16",
    kind: "activity",
    title: "Heute: Massage",
    text: "Note for massage day.", // TODO
  },
  {
    date: "2026-12-17",
    kind: "note",
    title: "Koffer packen!",
    text: "¡Tengo muchas ganas de ir contigo a Italia mañana y enseñarte la ciudad en la que he vivido!\n\nMe hace muchísima ilusión compartir estos días contigo. Hay tantos sitios y experiencias que quiero vivir contigo…, y no puedo esperar a que lleguen.\n\nTe quiero mucho ❤️",
  },

  // ── Together in Italy ─────────────────────────────────────────────────
  {
    date: "2026-12-18",
    kind: "song",
    title: "Ein Lied für die Reise",
    link: { href: "https://open.spotify.com/track/6gDqDzLxNdnkUWbVsW0Chc?si=fd3b57742a2e4e2f", label: "Anhören" },
    text: "Tal vez ya hayas escuchado esta canción antes, pero bueno, en este viaje tenía claramente que ser una canción en italiano!! Te ayudo a traducirla?",
  },
  {
    date: "2026-12-19",
    kind: "note",
    title: "Ciao amore",
    text: "Come siamo a Brescia e so che in realtà ti piacerebbe imparare l'italiano, ti scrivo questa nota così che tu possa provare a capirla, vediamo! Volevo semplicemente dirti quanto sono felice di essere qui con te!",
  },
  {
    date: "2026-12-20",
    kind: "activity",
    title: "Heutige Mission",
    text: "Mach heute ein Foto von uns zwei. 📸",
  },
  {
    date: "2026-12-21",
    kind: "note",
    title: "Diese Tage",
    text: "Hola mi amor, estos días contigo en Italia han sido increíbles. Me haces muy feliz y disfruto cada momento a tu lado.\n\nEspero que lo hayas pasado bien y que mis amigos no hayan hablado demasiado en italiano (lol ya sé que esto será difícil jaja, por lo menos no haya sido terrible).\n\nTengo que confesar que ya estoy triste de que vuelvas a Múnich y de pasar tantos días sin ti. Ya te echo de menos!\n\nY aunque tengo muchas ganas de volver a Santiago, la verdad es que tú también te has convertido en casa. Me gustaría pasar unas Navidades contigo, y espero que podamos hacerlo alguna vez.\n\nTe quiero y ya quiero verte ❤️",
  },

  // ── Apart ─────────────────────────────────────────────────────────────
    {
    date: "2026-12-22",
    kind: "poem",
    title: "Noch ein Gedicht",
    text: [
      "Por una mirada, un mundo;\npor una sonrisa, un cielo;\npor un beso… ¡yo no sé\nqué te diera por un beso!",
      "— Gustavo Adolfo Bécquer",
    ].join("\n\n"),
  },
  {
    date: "2026-12-23",
    kind: "voice",
    title: "Eine Sprachnachricht",
    audio: "/advent/TODO-memo-2.m4a",
  },
  {
    date: "2026-12-24",
    kind: "letter",
    title: "Heiligabend",
    image: "/advent/TODO-foto-des-jahres.jpg",
    imageAlt: "", // TODO
    text: [
      "Merry Christmas Eve, my love 🎄",
      "Twenty-four doors, twenty-four little pieces of me, and I hope each one made your morning a bit brighter.",
      "But I have to confess something: your advent calendar is a little particular. A normal one stops tonight, but mine doesn't, because I'm still far away, and I don't think you should have to count the days on your own.",
      "So tomorrow there will be another door, and the day after that, and every day until I'm back with you. Think of it as a calendar that counts down to us instead of to Christmas.",
      "I miss you, and I can't wait to see you. See you behind tomorrow's door ❤️",
    ].join("\n\n"),
  },

  // ── Bonus doors until I'm back (hidden until the 24th) ────────────────
  // One door per day until RETURN_DATE. If you change RETURN_DATE, add or
  // remove doors here so the numbers stay continuous.
  {
    date: "2026-12-25",
    kind: "note",
    title: "Frohe Weihnachten",
    text: "Bonus door #1.", // TODO
  },
  {
    date: "2026-12-26",
    kind: "song",
    title: "Ein Lied",
    link: { href: "https://open.spotify.com/", label: "Anhören" }, // TODO
  },
  {
    date: "2026-12-27",
    kind: "memory",
    title: "Name of the memory", // TODO
    text: "Bonus door.", // TODO
  },
  {
    date: "2026-12-28",
    kind: "note",
    title: "Ein Zettel",
    text: "Bonus door.", // TODO
  },
  {
    date: "2026-12-29",
    kind: "voice",
    title: "Eine Sprachnachricht",
    audio: "/advent/TODO-memo.m4a", // TODO
  },
  {
    date: "2026-12-22",
    kind: "poem",
    title: "Noch ein Gedicht",
    text: [
      "Von allen Seiten drängt ein drohend Grau\nUns zu. Die Luft will uns vergehen.\nIch aber kann des Himmels Blau,\nKann alles Trübe sonnvergoldet sehen.\nWeil ich dich liebe, dich, du frohe Frau.",
      "— Joachim Ringelnatz",
    ].join("\n\n"),
  },
  {
    date: "2026-12-31",
    kind: "song",
    title: "Ein Lied",
    link: { href: "https://open.spotify.com/", label: "Anhören" }, // TODO
  },
  {
    date: "2027-01-01",
    kind: "memory",
    title: "Name of the memory", // TODO
    text: "Bonus door.", // TODO
  },
  {
    date: "2027-01-02",
    kind: "note",
    title: "Ein Zettel",
    text: "Bonus door.", // TODO
  },
  {
    date: "2027-01-03",
    kind: "voice",
    title: "Eine Sprachnachricht",
    audio: "/advent/TODO-memo.m4a", // TODO
  },
  {
    date: "2027-01-04",
    kind: "photo",
    title: "Ein Foto",
    image: "/advent/TODO-foto.jpg", // TODO
  },
  {
    date: "2027-01-05",
    kind: "song",
    title: "Ein Lied",
    link: { href: "https://open.spotify.com/", label: "Anhören" }, // TODO
  },
  {
    date: RETURN_DATE,
    kind: "voucher",
    title: "Ich bin wieder da!",
    text: "Welcome-back note.", // TODO
    voucher: {
      what: "Ein Bier in einer Boazn 🍺",
      when: "Sobald ich zurück bin",
      fine: "Du suchst die Bar aus der Liste aus.",
    },
    link: { href: "https://bares-cutres.vercel.app", label: "Bar aussuchen" },
  },
];
