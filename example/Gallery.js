import * as React from 'react'
import { connect } from 'react-redux'
import { states } from './galleryState'

class Gallery extends React.Component {
  render() {
    const { currentState, openPhoto } = this.props
    return (
      <section className="ui-items" data-state={currentState}>
        {currentState === states.ERROR ? (
          <span className="ui-error">Uh oh, search failed.</span>
        ) : (
          this.props.items.map((item, i) => (
            <img
              src={item.media.m}
              className="ui-item"
              style={{ '--i': i }}
              key={item.link}
              onClick={() => openPhoto(item)}
            />
          ))
        )}
      </section>
    )
  }
}

export default connect(({ gallery }) => ({
  items: gallery.items,
  error: gallery.error
}))(Gallery)
