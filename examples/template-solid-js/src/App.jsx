import './App.css';
import { createService } from '@xstate/solid';
import { toggleMachine } from './toggle.machine';

function App() {
  const {state, send} = createService(toggleMachine);

  return (
    <div class="app">
      <h1>XState SolidJS Template</h1>
      <h2>Fork this template!</h2>
      <button onClick={() => send('TOGGLE')}>
        Click me ({state.matches('active') ? '✅' : '❌'})
      </button>{' '}
      <code>
        Toggled <strong>{state.context.count}</strong> times
      </code>
    </div>
  );
}

export default App;
