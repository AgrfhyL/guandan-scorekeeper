import { createContext, useContext } from 'react'

/**
 * True when the current match is being viewed in spectator mode (spec §16).
 * Pages read this to hide/disable all mutating controls. Default false (editor).
 */
const ReadOnlyContext = createContext(false)

export const ReadOnlyProvider = ReadOnlyContext.Provider
export const useReadOnly = () => useContext(ReadOnlyContext)
