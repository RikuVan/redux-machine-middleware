import { minify } from 'uglify-es'
import commonjs from 'rollup-plugin-commonjs'
import filesize from 'rollup-plugin-filesize'
import resolve from 'rollup-plugin-node-resolve'
import { uglify } from 'rollup-plugin-uglify'
import babel from 'rollup-plugin-babel'

function getConfig(dest, format, ugly) {
  const conf = {
    input: 'source/index.js',
    output: {
      exports: 'named',
      file: dest,
      format,
      name: 'redux-machine-middleware',
      sourcemap: true
    },
    plugins: [
      resolve({
        jsnext: true
      }),
      commonjs(),
      babel({
        plugins: ['@babel/external-helpers']
      }),
      ugly &&
        uglify(
          {
            warnings: true,
            toplevel: true,
            sourcemap: true,
            mangle: {
              properties: false
            }
          },
          minify
        ),
      filesize()
    ].filter(Boolean)
  }

  return conf
}

const config = [
  getConfig('dist/redux-machine-middleware.js', 'cjs', false),
  getConfig('dist/redux-machine-middleware.umd.js', 'umd', true),
  getConfig('dist/redux-machine-middleware.module.js', 'es', false)
]

export default config
