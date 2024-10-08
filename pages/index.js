import { Suspense, useCallback} from 'react'
import { Toaster } from 'react-hot-toast'
import JSZip from 'jszip'
import { encode as arrayBufferToBase64 } from 'base64-arraybuffer'
import dynamic from 'next/dynamic'
import suzanne from '../public/suzanne.gltf'
import SEO from '../components/SEO'
import FileDrop from '../components/fileDrop'
import Footer from '../components/footer'
import useStore from '../utils/store'
import { isGlb, isGltf, isZip } from '../utils/isExtension'
import { loadFileAsArrayBuffer, stringToArrayBuffer } from '../utils/buffers'
import { useTheme } from 'next-themes'

const Loading = () => <p className="text-4xl font-bold">Loading ...</p>

const Result = dynamic(() => import('../components/result'), {
  ssr: false,
  loading: Loading,
})

export default function Home() {
  const buffers = useStore((state) => state.buffers)
  const { theme } = useTheme()

  const onDrop = useCallback(async (acceptedFiles) => {
    const buffers = new Map()

    // load all files as arrayBuffer in the buffers map
    await Promise.all(
      acceptedFiles.map((file) =>
        loadFileAsArrayBuffer(file).then((buffer) => buffers.set(file.path.replace(/^\//, ''), buffer))
      )
    )

    // unzip files
    for (const [path, buffer] of buffers.entries()) {
      if (isZip(path)) {
        const { files } = await JSZip.loadAsync(buffer)
        for (const [path, file] of Object.entries(files)) {
          const buffer = await file.async('arraybuffer')
          buffers.set(path, buffer)
        }
        buffers.delete(path)
      }
    }

    const filePath = Array.from(buffers.keys()).find((path) => isGlb(path) || isGltf(path))

    useStore.setState({
      buffers,
      fileName: filePath,
      textOriginalFile: btoa(arrayBufferToBase64(buffers.get(filePath))),
    })
  }, [])

  const useSuzanne = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const arr = await stringToArrayBuffer(suzanne)
    useStore.setState({
      buffers: new Map().set('suzanne.gltf', arr),
      fileName: 'suzanne.gltf',
      textOriginalFile: suzanne,
    })
  }

  return (
    <div
      className={`flex flex-col items-center justify-center h-screen  ${theme === 'dark' ? 'dark' : 'light'}`} // Use theme classes
    >
      <main className="flex flex-col items-center justify-center flex-1">
        <Suspense fallback={<div>Loading</div>}>
          {buffers ? <Result /> : <FileDrop onDrop={onDrop} useSuzanne={useSuzanne} />}
        </Suspense>
      </main>
      <SEO />
      <Toaster />
      <Footer />
    </div>
  )
}
