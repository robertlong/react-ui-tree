import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Tree from './tree';
import Node from './node';

class UITree extends Component {
  static propTypes = {
    tree: PropTypes.object.isRequired,
    paddingLeft: PropTypes.number,
    scrollMargin: PropTypes.number,
    scrollSpeed: PropTypes.number,
    renderNode: PropTypes.func.isRequired,
    draggable: PropTypes.bool
  };

  static defaultProps = {
    paddingLeft: 20,
    scrollMargin: 20,
    scrollSpeed: 200,
    draggable: true
  };

  constructor(props) {
    super(props);

    this.state = this.init(props);
    this.treeEl = React.createRef();

    this.startScrollHeight = null;
    this.lastMousePos = { clientX: null, clientY: null };
    this.scrollEnabled = false;
    this.currentScrollSpeed = 0;
    this.lastScrollTimestamp = null;
  }

  componentWillReceiveProps(nextProps) {
    if (!this._updated && this.state.dragging.id === null) {
      this.setState(this.init(nextProps));
    } else {
      this._updated = false;
    }
  }

  init = props => {
    const tree = new Tree(props.tree);
    tree.isNodeCollapsed = props.isNodeCollapsed;
    tree.renderNode = props.renderNode;
    tree.changeNodeCollapsed = props.changeNodeCollapsed;
    tree.updateNodesPosition();

    return {
      tree: tree,
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null
      }
    };
  };

  getDraggingDom = () => {
    const { tree, dragging } = this.state;

    if (dragging && dragging.id) {
      const draggingIndex = tree.getIndex(dragging.id);
      const draggingStyles = {
        top: dragging.y,
        left: dragging.x,
        width: dragging.w
      };

      return (
        <div className="m-draggable" style={draggingStyles}>
          <Node
            tree={tree}
            index={draggingIndex}
            paddingLeft={this.props.paddingLeft}
          />
        </div>
      );
    }

    return null;
  };

  render() {
    const tree = this.state.tree;
    const dragging = this.state.dragging;
    const draggingDom = this.getDraggingDom();

    return (
      <div className="m-tree" ref={this.treeEl}>
        {draggingDom}
        <Node
          tree={tree}
          index={tree.getIndex(1)}
          key={1}
          paddingLeft={this.props.paddingLeft}
          onDragStart={this.props.draggable && this.dragStart}
          onCollapse={this.toggleCollapse}
          dragging={dragging && dragging.id}
        />
      </div>
    );
  }

  dragStart = (id, dom, e) => {
    if (e.button !== 0 || id === 1) return;

    const { scrollHeight, scrollTop } = this.treeEl.current;

    this.startScrollHeight = scrollHeight;

    this.setState({
      dragging: {
        id: id,
        w: dom.offsetWidth,
        h: dom.offsetHeight,
        ph: dom.parentNode.offsetHeight,
        x: dom.offsetLeft,
        y: dom.offsetTop,
      },
      start: {
        x: dom.offsetLeft,
        y: dom.offsetTop,
        offsetX: e.clientX,
        offsetY: e.clientY + scrollTop
      }
    });

    window.addEventListener('mousemove', this.drag);
    window.addEventListener('mouseup', this.dragEnd);

    this.lastMousePos.clientX = e.clientX;
    this.lastMousePos.clientY = e.clientY;
    this.scrollEnabled = true;
    requestAnimationFrame(this.scroll);
  };

  scroll = (timestamp) => {
    if (!this.scrollEnabled) return;

    if (this.lastScrollTimestamp === null || this.currentScrollSpeed === 0){
      this.lastScrollTimestamp = timestamp;
      requestAnimationFrame(this.scroll);
      return;
    }

    const delta = timestamp - this.lastScrollTimestamp;
    this.treeEl.current.scrollTop += this.currentScrollSpeed * delta / 1000;
    this.drag(this.lastMousePos);

    this.lastScrollTimestamp = timestamp;
    requestAnimationFrame(this.scroll);
  };

  drag = (e) => {
    if (e) {
      this.lastMousePos.clientX = e.clientX;
      this.lastMousePos.clientY = e.clientY;
    } else {
      e = this.lastMousePos;
    }
    const { clientX, clientY } = e;

    const tree = this.state.tree;
    const dragging = this.state.dragging;
    const { paddingLeft, scrollMargin, scrollSpeed } = this.props;
    let newIndex = null;
    let index = tree.getIndex(dragging.id);

    if (index === undefined) return;

    const collapsed = index.node.collapsed;

    const _startX = this.state.start.x;
    const _startY = this.state.start.y;
    const _offsetX = this.state.start.offsetX;
    const _offsetY = this.state.start.offsetY;

    const { scrollTop, clientHeight } = this.treeEl.current;

    const pos = {
      x: _startX + clientX - _offsetX,
      y: Math.min(this.startScrollHeight - dragging.ph, _startY + clientY + scrollTop - _offsetY)
    };
    dragging.x = pos.x;
    dragging.y = pos.y;

    const diffX = dragging.x - paddingLeft / 2 - (index.left - 2) * paddingLeft;
    const diffY = dragging.y - dragging.h / 2 - (index.top - 2) * dragging.h;

    if (diffX < 0) {
      // left
      if (index.parent && !index.next) {
        newIndex = tree.move(index.id, index.parent, 'after');
      }
    } else if (diffX > paddingLeft) {
      // right
      if (index.prev) {
        const prevNode = tree.getIndex(index.prev).node;
        if (!prevNode.collapsed && !prevNode.leaf) {
          newIndex = tree.move(index.id, index.prev, 'append');
        }
      }
    }

    if (newIndex) {
      index = newIndex;
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    if (diffY < 0) {
      // up
      const above = tree.getNodeByTop(index.top - 1);
      newIndex = tree.move(index.id, above.id, 'before');
    } else if (diffY > dragging.h) {
      // down
      if (index.next) {
        const below = tree.getIndex(index.next);
        if (below.children && below.children.length && !below.node.collapsed) {
          newIndex = tree.move(index.id, index.next, 'prepend');
        } else {
          newIndex = tree.move(index.id, index.next, 'after');
        }
      } else {
        const below = tree.getNodeByTop(index.top + index.height);
        if (below && below.parent !== index.id) {
          if (
            below.children &&
            below.children.length &&
            !below.node.collapsed
          ) {
            newIndex = tree.move(index.id, below.id, 'prepend');
          } else {
            newIndex = tree.move(index.id, below.id, 'after');
          }
        }
      }
    }

    if (newIndex) {
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    if (dragging.y + dragging.ph > scrollTop + clientHeight - scrollMargin) {
      this.currentScrollSpeed = scrollSpeed;
    } else if (dragging.y < scrollTop + scrollMargin) {
      this.currentScrollSpeed = -scrollSpeed;
    } else {
      this.currentScrollSpeed = 0;
    }

    this.setState({
      tree: tree,
      dragging: dragging
    });
  };

  dragEnd = () => {
    const draggingId = this.state.dragging.id;

    this.setState({
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null
      },
      start: null
    });

    window.removeEventListener('mousemove', this.drag);
    window.removeEventListener('mouseup', this.dragEnd);

    this.lastMousePos.clientX = null;
    this.lastMousePos.clientY = null;
    this.scrollEnabled = false;

    const index = this.state.tree.getIndex(draggingId);

    if (index === undefined) return;

    const parent = this.state.tree.get(index.parent);

    this.change(this.state.tree, parent, index.node);
  };

  change = (tree, parent, node) => {
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj, parent, node);
  };

  toggleCollapse = nodeId => {
    const tree = this.state.tree;
    const index = tree.getIndex(nodeId);
    const node = index.node;
    node.collapsed = !node.collapsed;
    tree.updateNodesPosition();

    this.setState({
      tree: tree
    });

    this.change(tree, null, null);
  };
}

module.exports = UITree;
