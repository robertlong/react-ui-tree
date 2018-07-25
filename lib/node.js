import cx from 'classnames';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

class UITreeNode extends Component {
  static propTypes = {
    dragThreshold: PropTypes.number
  };

  static defaultProps = {
    dragThreshold: 8
  };

  constructor(props) {
    super(props);
    this.innerRef = React.createRef();
  }

  renderCollapse = () => {
    const { index } = this.props;

    if (index.children && index.children.length) {
      const { collapsed } = index.node;

      return (
        <span
          className={cx('collapse', collapsed ? 'caret-right' : 'caret-down')}
          onMouseDown={e => e.stopPropagation()}
          onClick={this.handleCollapse}
        />
      );
    }

    return null;
  };

  renderChildren = () => {
    const { index, tree, dragging } = this.props;

    if (index.children && index.children.length) {
      const childrenStyles = {
        paddingLeft: this.props.paddingLeft
      };

      return (
        <div className="children" style={childrenStyles}>
          {index.children.map(child => {
            const childIndex = tree.getIndex(child);

            return (
              <UITreeNode
                tree={tree}
                index={childIndex}
                key={childIndex.id}
                dragging={dragging}
                paddingLeft={this.props.paddingLeft}
                onCollapse={this.props.onCollapse}
                onDragStart={this.props.onDragStart}
              />
            );
          })}
        </div>
      );
    }

    return null;
  };

  render() {
    const { tree, index, dragging } = this.props;
    const { node } = index;
    const styles = {};

    return (
      <div
        className={cx('m-node', {
          placeholder: index.id === dragging
        })}
        style={styles}
      >
        <div
          className="inner"
          ref={this.innerRef}
          onMouseDown={this.handleMouseDown}
        >
          {this.renderCollapse()}
          {tree.renderNode(node)}
        </div>
        {node.collapsed ? null : this.renderChildren()}
      </div>
    );
  }

  handleCollapse = e => {
    e.stopPropagation();
    const nodeId = this.props.index.id;

    if (this.props.onCollapse) {
      this.props.onCollapse(nodeId);
    }
  };

  handleMouseDown = e => {
    e.stopPropagation();
    this.startPos = { x: e.clientX, y: e.clientY };
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", () => {
      window.removeEventListener("mousemove", this.handleMouseMove);
    });
  };

  handleMouseMove = e => {
    if (!this.startPos) return;

    const { dragThreshold } = this.props;
    const deltaX = Math.abs(e.clientX - this.startPos.x);
    const deltaY = Math.abs(e.clientY - this.startPos.y);
    if (deltaX < dragThreshold && deltaY < dragThreshold) return;

    this.startPos = null;

    const nodeId = this.props.index.id;
    const dom = this.innerRef.current;
    if (this.props.onDragStart) {
      this.props.onDragStart(nodeId, dom, e);
    }
  };
}

module.exports = UITreeNode;
