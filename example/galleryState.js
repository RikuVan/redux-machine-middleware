import {all, takeLatest, call, put} from 'redux-saga/effects'
import {delay} from 'redux-saga'
import fetchJsonp from 'fetch-jsonp'

const UPDATE_QUERY = 'UPDATE_QUERY'
const SEARCH = 'SEARCH'
const COMPLETE_SEARCH = 'COMPLETE_SEARCH'
const UPDATE_GALLERY = 'UPDATE_GALLERY'
const OPEN_PHOTO = 'OPEN_PHOTO'

export const updateQuery = query => ({type: UPDATE_QUERY, query})
export const submitSearch = query => ({type: SEARCH, query})
export const completeSearch = (items, error) => ({
  type: COMPLETE_SEARCH,
  items,
  error
})
export const updateGallery = (items, error) => ({
  type: UPDATE_GALLERY,
  items,
  error
})
export const openPhoto = item => ({type: OPEN_PHOTO, item})

export const states = {
  NOT_ASKED: 'not-asked',
  START: 'start',
  LOADING: 'loading',
  GALLERY: 'gallery',
  ERROR: 'error',
  PHOTO: 'photo'
}

export const galleryMachine = {
  default: states.NOT_ASKED,
  selector: ['gallery'],
  states: [
    {
      name: states.NOT_ASKED
    },
    {
      name: states.START,
      autoTransitions: [
        {
          cond: (_, {type}) => type === SEARCH,
          to: states.LOADING
        }
      ],
      after: ({getState}) => submitSearch(getState().gallery.query),
      validTransitions: [states.LOADING]
    },
    {
      name: states.LOADING,
      autoTransitions: [
        {
          after: ({action}) => updateGallery(action.items),
          cond: (_, action) => action.type === COMPLETE_SEARCH && action.items,
          to: states.GALLERY
        },
        {
          cond: (_, action) => action.type === COMPLETE_SEARCH && action.error,
          to: states.ERROR
        }
      ],
      validTransitions: [states.GALLERY, states.ERROR]
    },
    {
      name: states.GALLERY,
      autoTransitions: [
        {
          cond: (_, action) => action.type === OPEN_PHOTO,
          to: states.PHOTO
        }
      ]
    },
    {
      name: states.PHOTO,
      validTransitions: [states.GALLERY]
    }
  ]
}

function* fetchImages(action) {
  yield delay(400)
  try {
    const response = yield call(
      fetchJsonp,
      `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${encodeURIComponent(
        action.query
      )}`,
      {jsonpCallback: 'jsoncallback'}
    )
    const {items} = yield response.json()
    yield put(completeSearch(items, null))
  } catch (error) {
    yield put(completeSearch(null, error))
  }
}

export function* gallerySaga() {
  yield all([takeLatest('SEARCH', fetchImages)])
}

export const galleryReducer = (state = {items: [], query: ''}, action) => {
  switch (action.type) {
    case UPDATE_QUERY: {
      return {...state, query: action.query}
    }
    case UPDATE_GALLERY: {
      return {...state, items: action.items, error: action.error}
    }
    case OPEN_PHOTO: {
      return {...state, photo: action.item}
    }
  }
  return state
}
