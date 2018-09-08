import React from 'react'
import { connect } from 'react-redux'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import {
  updateQuery,
  submitSearch,
  states,
  openPhoto,
  closePhoto
} from './galleryState'
import './index.scss'
import { store } from './store'
import Gallery from './Gallery'
import { transitionTo } from './middleware'

/*
  This example was adopting from an xstate example by David Khourshid: https://codepen.io/davidkpiano/pen/dJJMWE
*/

const transitionGallery = stateName => transitionTo('gallery', stateName)

class App extends React.Component {
  submit(e) {
    e.persist()
    e.preventDefault()
    this.props.submitSearch(e)
  }

  render() {
    const { currentState, transitionGallery, openPhoto, photo } = this.props
    const searchText =
      {
        [states.LOADING]: 'Searching...',
        [states.ERROR]: 'Try search again',
        [states.NOT_ASKED]: 'Search'
      }[currentState] || 'Search'
    return (
      <div className="ui-app" data-state={currentState}>
        <form
          className="ui-form"
          onSubmit={e => {
            e.preventDefault()
            transitionGallery(states.START)
          }}
        >
          <input
            type="search"
            className="ui-input"
            value={this.props.query}
            onChange={e => this.props.updateQuery(e.target.value)}
            placeholder="Search Flickr for photos..."
          />
          <div className="ui-buttons">
            <button className="ui-button" data-flip-key={currentState}>
              {searchText}
            </button>
            {currentState === states.LOADING && (
              <button
                className="ui-button"
                type="button"
                onClick={() => transitionGallery(states.GALLERY)}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {currentState === states.PHOTO ? (
          <section
            className="ui-photo-detail"
            onClick={() => transitionGallery(states.GALLERY)}
          >
            <img src={photo.media.m} className="ui-photo" />
          </section>
        ) : (
          <Gallery currentState={currentState} openPhoto={openPhoto} />
        )}
      </div>
    )
  }
}

const ConnectedApp = connect(
  ({ gallery, machines }) => ({
    query: gallery.query,
    currentState: machines.gallery.current,
    photo: gallery.photo
  }),
  { updateQuery, submitSearch, transitionGallery, openPhoto, closePhoto }
)(App)

ReactDOM.render(
  <Provider store={store}>
    <ConnectedApp />
  </Provider>,
  document.getElementById('root')
)

// Hot Module Replacement
if (module.hot) {
  module.hot.accept()
}
