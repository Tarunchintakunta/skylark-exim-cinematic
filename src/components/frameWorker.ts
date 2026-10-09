/**
 * Fetch and decode film frames off the main thread.
 *
 * The main thread posts { id, url }; this fetches the file, decodes it with
 * createImageBitmap and transfers the bitmap back, so neither the network
 * callbacks nor the decode ever land between two scroll frames. { abort: id }
 * cancels a request the reader has already scrolled past.
 */
type In = { id: number; url: string } | { abort: number }

const ctx = self as unknown as {
  onmessage: (e: MessageEvent<In>) => void
  postMessage: (msg: unknown, transfer?: Transferable[]) => void
}
const inflight = new Map<number, AbortController>()

ctx.onmessage = async (e) => {
  const msg = e.data
  if ('abort' in msg) {
    inflight.get(msg.abort)?.abort()
    return
  }
  const ctrl = new AbortController()
  inflight.set(msg.id, ctrl)
  try {
    const res = await fetch(msg.url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(String(res.status))
    const bmp = await createImageBitmap(await res.blob())
    ctx.postMessage({ id: msg.id, bmp }, [bmp])
  } catch (err) {
    ctx.postMessage({ id: msg.id, error: String(err) })
  } finally {
    inflight.delete(msg.id)
  }
}
