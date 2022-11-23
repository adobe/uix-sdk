export async function instrument(frame, fn) {
  let consoleStyle = "";
  const print = (str, ...args) =>
    console.log(`%c${frame}:%c ${str}`, consoleStyle, "", ...args);

  const srcFn = fn.toString().split("\n").slice(1).join("\n");
  document.getElementById("interface").innerHTML = srcFn.toString();
  const { color, backgroundColor } = window.getComputedStyle(document.body);
  consoleStyle = `display: inline-block; color: ${color}; background-color: ${backgroundColor}; padding: 2px;`;

  window.addEventListener("message", (m) => {
    print("window received message", JSON.stringify(m.data, null, 2));
  });

  const phantogram = await fn(print);
  return {
    app: phantogram.getRemoteApi(),
    print,
  };
}
