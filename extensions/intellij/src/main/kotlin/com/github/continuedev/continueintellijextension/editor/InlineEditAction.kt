package com.github.continuedev.continueintellijextension.editor

import com.github.continuedev.continueintellijextension.factories.CustomSchemeHandlerFactory
import com.github.continuedev.continueintellijextension.toolWindow.ContinueBrowser
import com.github.continuedev.continueintellijextension.toolWindow.JS_QUERY_POOL_SIZE
import com.intellij.icons.AllIcons
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.actions.IncrementalFindAction
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.editor.colors.EditorFontType
import com.intellij.openapi.editor.ex.EditorEx
import com.intellij.openapi.editor.impl.EditorImpl
import com.intellij.openapi.fileTypes.FileTypes
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Ref
import com.intellij.openapi.util.TextRange
import com.intellij.ui.EditorTextField
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefClient
import com.intellij.util.ui.UIUtil
import net.miginfocom.swing.MigLayout
import org.cef.CefApp
import org.cef.browser.CefBrowser
import org.cef.handler.CefLoadHandlerAdapter
import java.awt.Color
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.event.ComponentAdapter
import java.awt.event.ComponentEvent
import java.awt.event.KeyAdapter
import java.awt.event.KeyEvent
import javax.swing.BorderFactory
import javax.swing.JFrame
import javax.swing.JPanel
import javax.swing.JTextArea

/**
 * Adapted from https://github.com/cursive-ide/component-inlay-example/blob/master/src/main/kotlin/inlays/InlineEditAction.kt
 */
class InlineEditAction : AnAction(), DumbAware {
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = true
        e.presentation.isVisible = true
    }

    private var preloadedBrowser: ContinueBrowser? = null

    override fun actionPerformed(e: AnActionEvent) {
        if (e.project == null) return
        if (this.preloadedBrowser == null) {
            this.preloadedBrowser = ContinueBrowser(e.project!!,
                    "http://continue/editorInset/index.html", true)
//                    "http://localhost:5173/jetbrains_editorInset_index.html")
        }

        val editor = e.getData(PlatformDataKeys.EDITOR) ?: return
        val project = e.getData(PlatformDataKeys.PROJECT) ?: return
        val manager = EditorComponentInlaysManager.from(editor)
        val lineNumber = editor.document.getLineNumber(editor.caretModel.offset)

        // Get indentation width in pixels
        val lineStart = editor.document.getLineStartOffset(lineNumber)
        val lineEnd = editor.document.getLineEndOffset(lineNumber)
        val text = editor.document.getText(TextRange(lineStart, lineEnd))
        val indentation = text.takeWhile { it == ' ' }.length
        val charWidth = editor.contentComponent.getFontMetrics(editor.colorsScheme.getFont(EditorFontType.PLAIN)).charWidth(' ')
        val leftInset = indentation * charWidth * 2 / 3

        val inlayRef = Ref<Disposable>()
        val panel = makePanel(inlayRef, leftInset)
        val inlay = manager.insertAfter(lineNumber, panel)
        panel.revalidate()
        inlayRef.set(inlay)
        val viewport = (editor as? EditorImpl)?.scrollPane?.viewport
        viewport?.dispatchEvent(ComponentEvent(viewport, ComponentEvent.COMPONENT_RESIZED))

        // Set focus to the editor's browser component
        preloadedBrowser?.browser?.component?.requestFocus()

        preloadedBrowser?.onHeightChange {
            viewport?.dispatchEvent(ComponentEvent(viewport, ComponentEvent.COMPONENT_RESIZED))
        }

//        preloadedBrowser?.sendToWebview("jetbrains/editorInsetRefresh", null)
        // Set timeout
//        Thread.sleep(3000)
//        preloadedBrowser?.sendToWebview("jetbrains/editorInsetRefresh", null)
    }

    fun makePanel(inlayRef: Ref<Disposable>, leftInset: Int): JPanel {
        val action = object : AnAction({ "Close" }, AllIcons.Actions.Close) {
            override fun actionPerformed(e: AnActionEvent) {
                inlayRef.get().dispose()
            }
        }

        val browser = preloadedBrowser?.browser ?: return JPanel()
        browser.component.preferredSize = browser.component.preferredSize.apply {
            height = 60
        }

        val frame = JFrame("Text Area Example")
        frame.defaultCloseOperation = JFrame.EXIT_ON_CLOSE
        frame.setSize(400, 300)

        val textArea = CustomTextArea()
        textArea.background = Color(240, 240, 240)
        textArea.border = BorderFactory.createCompoundBorder(
                BorderFactory.createEmptyBorder(10, 10, 10, 10),
                BorderFactory.createLineBorder(Color.GRAY, 2)
        )
        textArea.lineWrap = true
        textArea.wrapStyleWord = true

        frame.add(textArea)
        frame.isVisible = true

        val panel = JPanel(MigLayout("wrap 1, insets 0 $leftInset 0 0, gap 0!, fillx")).apply {
            // Transparent background
            val globalScheme = EditorColorsManager.getInstance().globalScheme
            val defaultBackground = globalScheme.defaultBackground
            background = defaultBackground
//            add(textArea, "grow, gap 0!")
            add(browser.component, "grow, gap 0!")
            addComponentListener(object : ComponentAdapter() {
                override fun componentShown(e: ComponentEvent?) {
                    browser.component.requestFocus()
                }
            })
            putClientProperty(UIUtil.HIDE_EDITOR_FROM_DATA_CONTEXT_PROPERTY, true)
        }
        panel.isOpaque = false
        panel.addKeyListener(object : KeyAdapter() {
            override fun keyPressed(e: KeyEvent) {
                if (e.keyCode == KeyEvent.VK_ESCAPE) {
                    inlayRef.get().dispose()
                }
            }
        })

        preloadedBrowser?.onHeightChange { height ->
            browser.component.preferredSize = browser.component.preferredSize.apply {
//                this.height = height
                // Refresh
//                browser.component.revalidate()
//                browser.component.repaint()
//
//                // Refresh the panel
//                panel.revalidate()
//                panel.repaint()
            }
        }

        return panel
    }
}

class CustomTextArea : JTextArea() {
    override fun paintComponent(g: Graphics) {
        val g2 = g as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = background
        g2.fillRoundRect(0, 0, width - 1, height - 1, 15, 15)
        super.paintComponent(g)
    }
}