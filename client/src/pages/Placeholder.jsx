export default function Placeholder({ title, part }) {
  return <div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 text-stone">This page is built in Part {part}.</p></div>;
}
